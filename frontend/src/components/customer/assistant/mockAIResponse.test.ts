import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SWIFTDROP_AI_INITIAL_SUGGESTIONS,
  SWIFTDROP_AI_WELCOME_MESSAGE,
  aiAssistantService,
  generateMockAIResponse,
} from './mockAIResponse.ts';

test('welcome message and initial suggested questions match customer requirements', () => {
  assert.match(SWIFTDROP_AI_WELCOME_MESSAGE, /Welcome to SwiftDrop/i);
  assert.deepEqual(
    SWIFTDROP_AI_INITIAL_SUGGESTIONS.map((item) => item.text),
    [
      '📦 Where is my parcel?',
      '💰 Calculate delivery fee',
      '🚚 How do I send a parcel?',
    ]
  );
});

test('handles parcel tracking prompt and extracted tracking codes without fabricating tracking state', () => {
  const prompt = generateMockAIResponse('📦 Where is my parcel?');
  assert.equal(prompt.category, 'tracking_prompt');
  assert.match(prompt.reply, /provide your tracking number/i);

  const codeReply = generateMockAIResponse('Track SD123456.');
  assert.equal(codeReply.category, 'tracking_code');
  assert.equal(codeReply.extractedTrackingNumber, 'SD123456');
  assert.match(codeReply.reply, /received your tracking number SD123456/i);
  assert.match(codeReply.reply, /In the full version/i);
});

test('handles delivery fee inquiries, send parcel steps, and failed delivery guidance', () => {
  const feePrompt = generateMockAIResponse('💰 Calculate delivery fee');
  assert.equal(feePrompt.category, 'fee_estimate');
  assert.match(feePrompt.reply, /pickup location, destination, and parcel weight/i);

  const feeDetails = generateMockAIResponse('Colombo to Kandy 2.5 kg');
  assert.equal(feeDetails.category, 'fee_estimate');
  assert.match(feeDetails.reply, /Create Delivery/i);

  const sendSteps = generateMockAIResponse('🚚 How do I send a parcel?');
  assert.equal(sendSteps.category, 'send_parcel');
  assert.match(sendSteps.reply, /1\. Enter your pickup location\./);
  assert.match(sendSteps.reply, /5\. Confirm your delivery request\./);

  const failed = generateMockAIResponse('My delivery failed. What should I do?');
  assert.equal(failed.category, 'failed_delivery');
  assert.match(failed.reply, /couldn't complete the delivery attempt/i);
});

test('handles customer FAQs and blocks non-customer internal operations', () => {
  assert.equal(generateMockAIResponse('What is the delivery time?').category, 'delivery_time');
  assert.equal(generateMockAIResponse('What parcel sizes do you accept?').category, 'parcel_sizes');
  assert.equal(generateMockAIResponse('Explain the delivery process').category, 'delivery_process');
  assert.equal(generateMockAIResponse('How do I cancel my delivery?').category, 'cancellation');
  assert.equal(generateMockAIResponse('What do the delivery statuses mean?').category, 'status_meaning');
  assert.equal(generateMockAIResponse('How can I contact customer support?').category, 'support');

  const outOfScope = generateMockAIResponse('Open dispatcher courier assignments and edit pricing rules');
  assert.equal(outOfScope.category, 'scope_boundary');
  assert.match(outOfScope.reply, /customer delivery assistant/i);

  const fallback = generateMockAIResponse('Hello, nice weather today');
  assert.equal(fallback.category, 'fallback');
  assert.match(fallback.reply, /tracking a parcel, delivery fees, sending a parcel, or delivery statuses/i);
});

test('aiAssistantService validates empty input and resolves mock response asynchronously', async () => {
  await assert.rejects(
    () => aiAssistantService.sendMessage('   ', 'cust-session-1'),
    /enter a message/i
  );

  const response = await aiAssistantService.sendMessage('Track SD-884920', 'cust-session-1');
  assert.equal(response.category, 'tracking_code');
  assert.equal(response.extractedTrackingNumber, 'SD-884920');
});
