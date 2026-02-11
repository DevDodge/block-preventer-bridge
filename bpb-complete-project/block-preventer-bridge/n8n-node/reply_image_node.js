// ============================================================
// n8n Code Node: Reply with Image via Block Preventer Bridge
// ============================================================
// Sends a single image message with an optional caption to a
// WhatsApp chat through the Block Preventer Bridge backend.
//
// Use this node when you only need to send one image (not a
// full multi-part sequence).
// ============================================================

const BRIDGE_BASE_URL = 'https://guard.whatsdeveloper.com/api/v1';

for (const item of $input.all()) {
  // Get required credentials from the Keys node
  const apiKey = $('Keys').item.json['api-key'];
  const deviceUuid = $('Keys').item.json['uuid'];
  const chatId = item.json.chatId;

  // Image data – adjust field names to match your workflow
  const imageUrl = item.json.imageUrl || item.json.image_url || item.json.imageLink || '';
  const caption = item.json.caption || item.json.imageCaption || '';

  // Build the request payload
  const payload = {
    device_uuid: deviceUuid,
    api_key: apiKey,
    chat_id: chatId,
    image_url: imageUrl,
    caption: caption
  };

  try {
    // Call the Block Preventer Bridge reply-image endpoint
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: `${BRIDGE_BASE_URL}/messages/reply-image`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload,
      timeout: 60000  // 1 minute
    });

    // Store the response
    item.json.replyImageResult = {
      status: response.status,
      message: response.message,
      zentra_response: response.zentra_response || null
    };

  } catch (error) {
    item.json.replyImageResult = {
      status: 'bridge_error',
      message: error.message,
      zentra_response: null
    };
  }
}

return $input.all();
