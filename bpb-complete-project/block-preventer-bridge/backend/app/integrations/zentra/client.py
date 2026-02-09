"""Zentra API Client for sending WhatsApp messages."""
import aiohttp
import logging
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class ZentraClient:
    """Client for interacting with Zentra WhatsApp API."""
    
    BASE_URL = "https://api.zentra.io/v1"
    
    def __init__(self, api_token: str, device_uuid: str):
        self.api_token = api_token
        self.device_uuid = device_uuid
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, data: dict = None) -> Dict[str, Any]:
        """Make an HTTP request to Zentra API."""
        url = f"{self.BASE_URL}{endpoint}"
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, url, json=data, headers=self.headers, timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_time_ms = int((time.time() - start_time) * 1000)
                    result = await response.json()
                    
                    return {
                        "success": response.status in (200, 201),
                        "status_code": response.status,
                        "data": result,
                        "response_time_ms": response_time_ms
                    }
        except aiohttp.ClientError as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Zentra API error: {str(e)}")
            return {
                "success": False,
                "status_code": 0,
                "data": {"error": str(e)},
                "response_time_ms": response_time_ms
            }
        except Exception as e:
            logger.error(f"Unexpected error calling Zentra: {str(e)}")
            return {
                "success": False,
                "status_code": 0,
                "data": {"error": str(e)},
                "response_time_ms": 0
            }
    
    async def send_text(self, recipient: str, text: str) -> Dict[str, Any]:
        """Send a text message."""
        return await self._request("POST", f"/devices/{self.device_uuid}/messages/text", {
            "to": recipient,
            "text": text
        })
    
    async def send_image(self, recipient: str, image_url: str, caption: str = None) -> Dict[str, Any]:
        """Send an image message."""
        data = {"to": recipient, "image_url": image_url}
        if caption:
            data["caption"] = caption
        return await self._request("POST", f"/devices/{self.device_uuid}/messages/image", data)
    
    async def send_voice(self, recipient: str, audio_url: str) -> Dict[str, Any]:
        """Send a voice message."""
        return await self._request("POST", f"/devices/{self.device_uuid}/messages/voice", {
            "to": recipient,
            "audio_url": audio_url
        })
    
    async def send_document(self, recipient: str, document_url: str, caption: str = None) -> Dict[str, Any]:
        """Send a document."""
        data = {"to": recipient, "document_url": document_url}
        if caption:
            data["caption"] = caption
        return await self._request("POST", f"/devices/{self.device_uuid}/messages/document", data)
    
    async def send_video(self, recipient: str, video_url: str, caption: str = None) -> Dict[str, Any]:
        """Send a video message."""
        data = {"to": recipient, "video_url": video_url}
        if caption:
            data["caption"] = caption
        return await self._request("POST", f"/devices/{self.device_uuid}/messages/video", data)
    
    async def send_message(self, recipient: str, message_type: str, content: str,
                           media_url: str = None, caption: str = None) -> Dict[str, Any]:
        """Send a message of any type."""
        if message_type == "text":
            return await self.send_text(recipient, content)
        elif message_type == "image":
            return await self.send_image(recipient, media_url or content, caption)
        elif message_type == "voice":
            return await self.send_voice(recipient, media_url or content)
        elif message_type == "document":
            return await self.send_document(recipient, media_url or content, caption)
        elif message_type == "video":
            return await self.send_video(recipient, media_url or content, caption)
        else:
            return {"success": False, "data": {"error": f"Unknown message type: {message_type}"}, "response_time_ms": 0}
    
    async def check_whatsapp(self, phone_number: str) -> Dict[str, Any]:
        """Check if a phone number is on WhatsApp."""
        return await self._request("POST", f"/devices/{self.device_uuid}/check-whatsapp", {
            "phone": phone_number
        })
    
    async def health_check(self) -> Dict[str, Any]:
        """Check device health status."""
        return await self._request("GET", f"/devices/{self.device_uuid}/status")
