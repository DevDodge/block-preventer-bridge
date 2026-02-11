// ============================================================
// n8n Code Node: Send Sequential Messages via Block Preventer Bridge
// ============================================================
// Instead of calling the Zentra API directly (which causes ordering
// issues and 404 errors), this node delegates the entire sequence
// to the Block Preventer Bridge backend at guard.whatsdeveloper.com.
//
// The backend handles:
//   - Strict sequential ordering
//   - Controlled delays (2.5s text, 6s image/video)
//   - Per-chat concurrency locking
//   - Error resilience (failed parts don't abort the sequence)
// ============================================================

const BRIDGE_BASE_URL = 'https://guard.whatsdeveloper.com/api/v1';

for (const item of $input.all()) {
  // Get required credentials from the Keys node
  const apiKey = $('Keys').item.json['api-key'];
  const deviceUuid = $('Keys').item.json['uuid'];
  const chatId = item.json.chatId;

  // Use the already extracted parts from the previous node
  const rawParts = item.json.parts || [];

  // Transform parts into the format expected by the send-sequence API
  // The API expects: { type, text, imageLink, videoLink, caption }
  const sequenceParts = rawParts.map(part => {
    if (part.type === 'text') {
      return {
        type: 'text',
        text: (part.text || '').trim()
      };
    }

    if (part.type === 'image') {
      return {
        type: 'image',
        imageLink: part.imageLink || '',
        caption: part.caption || ''
      };
    }

    if (part.type === 'video') {
      return {
        type: 'video',
        videoLink: part.videoLink || '',
        caption: part.caption || ''
      };
    }

    // Unknown type – pass through as text fallback
    return {
      type: 'text',
      text: (part.text || '').trim()
    };
  });

  // Build the request payload for the send-sequence endpoint
  const payload = {
    device_uuid: deviceUuid,
    api_key: apiKey,
    chat_id: chatId,
    parts: sequenceParts
  };

  try {
    // Call the Block Preventer Bridge send-sequence endpoint
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: `${BRIDGE_BASE_URL}/messages/send-sequence`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload,
      // Generous timeout: the backend may take a while for long sequences
      // (each part has up to 6s delay + 30s Zentra timeout)
      timeout: 300000  // 5 minutes
    });

    // Store the full structured response from the bridge
    item.json.sendResults = response.results || [];
    item.json.sequenceStatus = response.status;        // "completed"
    item.json.sequenceSummary = {
      total_parts: response.total_parts,
      successful: response.successful,
      failed: response.failed,
      skipped: response.skipped || 0
    };

  } catch (error) {
    // If the bridge itself is unreachable, store the error
    item.json.sendResults = [];
    item.json.sequenceStatus = 'bridge_error';
    item.json.sequenceSummary = {
      total_parts: sequenceParts.length,
      successful: 0,
      failed: sequenceParts.length,
      skipped: 0
    };
    item.json.bridgeError = error.message;
  }
}

return $input.all();
