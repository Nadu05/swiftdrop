import type {
  AIAssistantService,
  AIResponsePayload,
  SuggestedQuestionItem,
} from './types';

export const SWIFTDROP_AI_WELCOME_MESSAGE =
  "Hi there! 👋 Welcome to SwiftDrop. I'm your delivery assistant. I can help you track your parcel, estimate delivery charges, or answer questions about our delivery services. What would you like help with today?";

export const SWIFTDROP_AI_INITIAL_SUGGESTIONS: readonly SuggestedQuestionItem[] = [
  { id: 'where-is-parcel', text: '📦 Where is my parcel?' },
  { id: 'calculate-fee', text: '💰 Calculate delivery fee' },
  { id: 'how-to-send', text: '🚚 How do I send a parcel?' },
];

const OUT_OF_SCOPE_PATTERNS: readonly RegExp[] = [
  /\bdispatcher\b/i,
  /\bassign\s+(?:a\s+)?courier\b/i,
  /\bcourier\s+(?:management|assignment|assignments|earnings|fleet|workload)\b/i,
  /\bmerchant\s+(?:api|onboarding|approval|approvals|portal)\b/i,
  /\badmin\s+(?:dashboard|portal|panel|operations)\b/i,
  /\b(?:change|update|modify|override)\s+(?:the\s+)?(?:parcel|order|delivery)\s+status\b/i,
  /\b(?:manage|edit|configure)\s+(?:delivery\s+)?(?:zones|pricing\s+rules)\b/i,
  /\bpricing\s+rules\b/i,
  /\binternal\s+delivery\s+management\b/i,
  /\btransfer\s+manifest\b/i,
];

const SD_TRACKING_CODE_REGEX = /\b(SD-?\d{3,10})\b/i;
const GENERIC_TRACKING_COMMAND_REGEX =
  /\btrack(?:ing)?\s+(?:number\s+|code\s+|id\s+)?((?=.*\d)[A-Z0-9-]{4,16})\b/i;

const WEIGHT_DETAIL_REGEX = /\b\d+(?:\.\d+)?\s*(?:kg|kgs|g|grams?|kilos?|kilograms?)\b/i;
const ROUTE_DETAIL_REGEX = /\bfrom\s+[a-z][a-z0-9\s,.-]{1,35}\s+to\s+[a-z][a-z0-9\s,.-]{1,35}/i;

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractTrackingNumber(input: string): string | null {
  const sdMatch = input.match(SD_TRACKING_CODE_REGEX);
  if (sdMatch?.[1]) {
    return sdMatch[1].toUpperCase();
  }

  const genericMatch = input.match(GENERIC_TRACKING_COMMAND_REGEX);
  if (genericMatch?.[1]) {
    return genericMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Generates a customer-friendly mock response for the SwiftDrop AI UI.
 * Isolated from UI components so it can later be swapped for a backend AI API.
 */
export function generateMockAIResponse(input: string): AIResponsePayload {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      category: 'scope_boundary',
      reply:
        "I'm SwiftDrop AI, your personal customer delivery assistant. I can only help with customer delivery topics such as tracking parcels, estimating delivery fees, creating a delivery request, or understanding delivery statuses.",
    };
  }

  const trackingNumber = extractTrackingNumber(trimmed);
  if (trackingNumber) {
    return {
      category: 'tracking_code',
      extractedTrackingNumber: trackingNumber,
      reply: `I've received your tracking number ${trackingNumber}. In the full version, I'll retrieve your parcel's latest status and delivery updates for you.`,
    };
  }

  if (
    matchesAny(lower, [
      'where is my parcel',
      'where is my order',
      'where is my package',
      'track my parcel',
      'track parcel',
      'track a parcel',
      'find my parcel',
      'locate my parcel',
      'check my parcel',
      'tracking number',
    ])
  ) {
    return {
      category: 'tracking_prompt',
      reply:
        "Of course! 📦 Please provide your tracking number, and I'll help you find the latest information about your parcel.",
    };
  }

  if (
    WEIGHT_DETAIL_REGEX.test(trimmed) ||
    (ROUTE_DETAIL_REGEX.test(lower) && matchesAny(lower, ['fee', 'charge', 'cost', 'estimate', 'price', 'rate']))
  ) {
    return {
      category: 'fee_estimate',
      reply:
        "Thanks for sharing those details! In the full version, I'll calculate an instant estimate right here in chat. For now, you can enter your pickup and destination postal areas along with the parcel weight and size on the 'Create Delivery' page to view your delivery fee quotation before confirming.",
    };
  }

  if (
    matchesAny(lower, [
      'calculate delivery fee',
      'calculate fee',
      'delivery fee',
      'delivery charge',
      'delivery charges',
      'estimate fee',
      'estimate delivery fee',
      'how much does delivery cost',
      'how much to send',
      'shipping cost',
      'shipping rate',
      'delivery cost',
      'delivery price',
    ])
  ) {
    return {
      category: 'fee_estimate',
      reply:
        "I'd be happy to help estimate your delivery fee! 📍 Please tell me your pickup location, destination, and parcel weight.",
    };
  }

  if (
    matchesAny(lower, [
      'how do i send a parcel',
      'send a parcel',
      'send parcel',
      'create delivery',
      'create a delivery',
      'book a delivery',
      'book delivery',
      'how to ship',
      'new delivery',
      'delivery request',
    ])
  ) {
    return {
      category: 'send_parcel',
      reply:
        "You can send a parcel with SwiftDrop in just a few steps:\n\n1. Enter your pickup location.\n2. Enter the recipient's delivery address.\n3. Provide your parcel's weight and size.\n4. Review the estimated delivery fee.\n5. Confirm your delivery request.\n\nYou can start by selecting 'Create Delivery' from your dashboard.",
    };
  }

  if (
    matchesAny(lower, [
      'delivery failed',
      'failed delivery',
      'missed delivery',
      "couldn't deliver",
      'could not deliver',
      'failed attempt',
      'delivery attempt',
      'unsuccessful delivery',
    ])
  ) {
    return {
      category: 'failed_delivery',
      reply:
        'A failed delivery usually means our courier couldn\'t complete the delivery attempt. You can check the details and any instructions available on your tracking page. If further assistance is needed, contact our support team.',
    };
  }

  if (matchesAny(lower, ['cancel', 'cancellation'])) {
    return {
      category: 'cancellation',
      reply:
        "If you need to cancel a delivery request, please check your booking's current status on the 'My Deliveries' page. Cancellation availability depends on whether the parcel has already been picked up or dispatched. For further help with an active booking, please contact our customer support team.",
    };
  }

  if (
    matchesAny(lower, [
      'delivery time',
      'how long',
      'estimated delivery',
      'when will it arrive',
      'when will my parcel arrive',
      'eta',
      'same day',
      'how fast',
    ])
  ) {
    return {
      category: 'delivery_time',
      reply:
        "Delivery times depend on the pickup and destination locations, route distance, and dispatch schedule. Once your parcel is booked, you can check its latest progress and estimated updates on the 'Track Parcel' or 'My Deliveries' page.",
    };
  }

  if (
    matchesAny(lower, [
      'parcel size',
      'accepted size',
      'accepted parcel',
      'size limit',
      'weight limit',
      'dimensions',
      'how heavy',
      'package size',
      'parcel sizes',
    ])
  ) {
    return {
      category: 'parcel_sizes',
      reply:
        "SwiftDrop supports standard parcel size categories—Small, Medium, Large, and Extra Large—along with weight in kilograms when creating a booking. Please verify exact size and weight availability directly on the 'Create Delivery' page before confirming your shipment.",
    };
  }

  if (
    matchesAny(lower, [
      'status',
      'statuses',
      'in transit',
      'out for delivery',
      'picked up',
      'pickup assigned',
      'confirmed',
      'pending dispatcher',
    ])
  ) {
    return {
      category: 'status_meaning',
      reply:
        "Here is what common SwiftDrop parcel statuses mean:\n\n• Created / Confirmed: Your delivery request has been registered.\n• Pickup Assigned / Picked Up: A courier is assigned or has collected your parcel.\n• In Transit: Your parcel is moving between SwiftDrop branches.\n• Out for Delivery: A courier is on the way to the recipient's address.\n• Delivered: Your parcel has been delivered to the recipient.",
    };
  }

  if (
    matchesAny(lower, [
      'pickup',
      'pick up',
      'drop-off',
      'dropoff',
      'drop off',
      'branch drop',
    ])
  ) {
    return {
      category: 'pickup_dropoff',
      reply:
        'When creating a delivery request with SwiftDrop, you can choose between Courier Pickup (where a courier collects the parcel from your pickup address) or Branch Drop-off (where you hand over the parcel at an available SwiftDrop branch). Please make sure both pickup and drop-off details include accurate addresses, postal areas, and contact phone numbers.',
    };
  }

  if (
    matchesAny(lower, [
      'delivery process',
      'services',
      'service',
      'how does swiftdrop work',
      'cash on delivery',
      'cod',
      'prepaid',
      'payment',
    ])
  ) {
    return {
      category: 'delivery_process',
      reply:
        'SwiftDrop provides customer parcel delivery with Courier Pickup or Branch Drop-off options, Prepaid or Cash on Delivery (COD) payment choices, live milestone tracking, and digital proof of delivery. Please refer to the official SwiftDrop service pages for full policy and service details.',
    };
  }

  if (
    matchesAny(lower, [
      'support',
      'contact',
      'help desk',
      'customer service',
      'talk to human',
      'helpdesk',
    ])
  ) {
    return {
      category: 'support',
      reply:
        'If you need additional help with your parcel, please reach out to SwiftDrop Customer Support through the official support channels listed on our website and keep your tracking number ready.',
    };
  }

  return {
    category: 'fallback',
    reply:
      "I'm happy to help with your delivery questions! You can ask me about tracking a parcel, delivery fees, sending a parcel, or delivery statuses.",
  };
}

/**
 * Future-ready AI assistant service abstraction.
 * Replace the mock implementation below with a backend API call when ready.
 */
export const aiAssistantService: AIAssistantService = {
  async sendMessage(message: string, _conversationId: string): Promise<AIResponsePayload> {
    const trimmed = message.trim();
    if (!trimmed) {
      throw new Error('Please enter a message before sending.');
    }

    await new Promise((resolve) => setTimeout(resolve, 480));
    return generateMockAIResponse(trimmed);
  },
};
