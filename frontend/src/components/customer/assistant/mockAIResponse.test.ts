import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_MESSAGE_LENGTH,
  AssistantApiError,
  buildAssistantHistoryPayload,
  isCustomerAssistantAuthorized,
  mapAssistantCategory,
  normalizeAssistantApiError,
  normalizeConversationId,
} from './assistant-helpers';
import {
  SWIFTDROP_AI_INITIAL_SUGGESTIONS,
  SWIFTDROP_AI_WELCOME_MESSAGE,
  aiAssistantService,
  generateMockAIResponse,
} from './mockAIResponse';

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

test('buildAssistantHistoryPayload filters welcome/error entries and enforces max count and length', () => {
  const oversized = 'x'.repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 50);
  const messages = [
    {
      id: 'welcome-msg',
      sender: 'assistant' as const,
      content: 'Welcome to SwiftDrop',
      timestamp: '2026-01-01T00:00:00Z',
      category: 'welcome' as const,
    },
    {
      id: 'err-1',
      sender: 'assistant' as const,
      content: 'Temporary failure',
      timestamp: '2026-01-01T00:00:01Z',
      category: 'error' as const,
      isError: true,
    },
    ...Array.from({ length: 12 }, (_, idx) => ({
      id: `m-${idx}`,
      sender: (idx % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: idx === 11 ? `  ${oversized}  ` : `  turn ${idx}  `,
      timestamp: '2026-01-01T00:00:02Z',
    })),
  ];

  const history = buildAssistantHistoryPayload(messages);
  assert.equal(history.length, ASSISTANT_MAX_HISTORY_MESSAGES);
  assert.equal(history[0].content, 'turn 2');
  assert.equal(history[history.length - 1].content.length, ASSISTANT_MAX_MESSAGE_LENGTH);
  assert.deepEqual(
    history.map((item) => item.role),
    ['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant']
  );
});

test('normalizeAssistantApiError maps HTTP status codes and network failures cleanly without leaking internals', () => {
  const err400 = normalizeAssistantApiError({
    response: {
      status: 400,
      data: { fieldErrors: { message: 'Message must be 1000 characters or fewer' } },
    },
  });
  assert.ok(err400 instanceof AssistantApiError);
  assert.equal(err400.status, 400);
  assert.equal(err400.retryable, false);
  assert.equal(err400.message, 'Message must be 1000 characters or fewer');

  const leaky400 = normalizeAssistantApiError({
    response: {
      status: 400,
      data: { message: 'NullPointerException with apiKey sk-secret123 at http://internal' },
    },
  });
  assert.doesNotMatch(leaky400.message, /sk-secret|NullPointerException|internal/i);

  const err401 = normalizeAssistantApiError({ response: { status: 401 } });
  assert.equal(err401.status, 401);
  assert.equal(err401.retryable, false);
  assert.match(err401.message, /session has expired/i);

  const err403 = normalizeAssistantApiError({ response: { status: 403 } });
  assert.equal(err403.status, 403);
  assert.equal(err403.retryable, false);
  assert.match(err403.message, /active customer accounts/i);

  const err429 = normalizeAssistantApiError({ response: { status: 429 } });
  assert.equal(err429.status, 429);
  assert.equal(err429.retryable, true);
  assert.match(err429.message, /too fast/i);

  const err503 = normalizeAssistantApiError({ response: { status: 503 } });
  assert.equal(err503.status, 503);
  assert.equal(err503.retryable, true);
  assert.match(err503.message, /temporarily unable/i);

  const timeoutErr = normalizeAssistantApiError({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' });
  assert.equal(timeoutErr.status, 0);
  assert.equal(timeoutErr.retryable, true);
  assert.match(timeoutErr.message, /timed out/i);

  const networkErr = normalizeAssistantApiError({ code: 'ERR_NETWORK', message: 'Network Error' });
  assert.equal(networkErr.status, 0);
  assert.equal(networkErr.retryable, true);
  assert.match(networkErr.message, /connection/i);
});

test('isCustomerAssistantAuthorized permits active CUSTOMER-only accounts and rejects visitors and staff', () => {
  assert.equal(isCustomerAssistantAuthorized(null, null), false);
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['CUSTOMER'], accountStatus: 'SUSPENDED' }, 'CUSTOMER'),
    false
  );
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['ADMIN'], accountStatus: 'ACTIVE' }, 'ADMIN'),
    false
  );
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['CUSTOMER', 'DISPATCHER'], accountStatus: 'ACTIVE' }, 'CUSTOMER'),
    false
  );
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['CUSTOMER'], accountStatus: 'ACTIVE' }, 'ADMIN'),
    false
  );
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['CUSTOMER'], accountStatus: 'ACTIVE' }, 'CUSTOMER'),
    true
  );
  assert.equal(
    isCustomerAssistantAuthorized({ roles: ['ROLE_CUSTOMER'], accountStatus: 'active' }, null),
    true
  );
});

test('mapAssistantCategory and normalizeConversationId sanitize backend fields safely', () => {
  assert.equal(mapAssistantCategory('tracking_code'), 'tracking_code');
  assert.equal(mapAssistantCategory('UNKNOWN_FROM_LLM'), 'assistant');
  assert.equal(mapAssistantCategory(undefined), 'assistant');

  assert.equal(normalizeConversationId('   '), undefined);
  assert.equal(normalizeConversationId(' cust-session-2 '), 'cust-session-2');
  assert.equal(normalizeConversationId('a'.repeat(150))?.length, 100);
});
