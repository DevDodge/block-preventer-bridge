"""Zentra API Client for sending WhatsApp messages."""
import aiohttp
import logging
import time
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class ZentraClient:
    """Client for interacting with Zentra WhatsApp API."""
    
    BASE_URL = "https://api.zentramsg.com/v1"
    
    def __init__(self, api_token: str, device_uuid: str):
        self.api_token = api_token
        self.device_uuid = device_uuid
    
    async def _request(self, endpoint: str, form_data: dict) -> Dict[str, Any]:
        """Make an HTTP request to Zentra API using multipart/form-data."""
        url = f"{self.BASE_URL}{endpoint}"
        start_time = time.time()
        
        headers = {
            "x-api-token": self.api_token,
            "accept": "*/*"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                data = aiohttp.FormData()
                for key, value in form_data.items():
                    data.add_field(key, str(value))
                
                async with session.post(
                    url, data=data, headers=headers, timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_time_ms = int((time.time() - start_time) * 1000)
                    
                    try:
                        result = await response.json()
                    except:
                        result = {"raw_response": await response.text()}
                    
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
        """Send a text message to one recipient."""
        return await self._request("/messages", {
            "device_uuid": self.device_uuid,
            "text_message": text,
            "type_message": "text",
            "type_contact": "numbers",
            "ids": recipient
        })
    
    async def send_text_bulk(self, recipients: List[str], text: str) -> Dict[str, Any]:
        """Send a text message to multiple recipients."""
        return await self._request("/messages", {
            "device_uuid": self.device_uuid,
            "text_message": text,
            "type_message": "text",
            "type_contact": "numbers",
            "ids": ",".join(recipients)
        })
    
    async def send_image(self, recipient: str, image_url: str, caption: str = None) -> Dict[str, Any]:
        """Send an image message."""
        data = {
            "device_uuid": self.device_uuid,
            "type_message": "image",
            "type_contact": "numbers",
            "ids": recipient,
            "media_url": image_url
        }
        if caption:
            data["text_message"] = caption
        return await self._request("/messages", data)
    
    async def send_voice(self, recipient: str, audio_url: str) -> Dict[str, Any]:
        """Send a voice message."""
        return await self._request("/messages", {
            "device_uuid": self.device_uuid,
            "type_message": "audio",
            "type_contact": "numbers",
            "ids": recipient,
            "media_url": audio_url
        })
    
    async def send_document(self, recipient: str, document_url: str, caption: str = None) -> Dict[str, Any]:
        """Send a document."""
        data = {
            "device_uuid": self.device_uuid,
            "type_message": "document",
            "type_contact": "numbers",
            "ids": recipient,
            "media_url": document_url
        }
        if caption:
            data["text_message"] = caption
        return await self._request("/messages", data)
    
    async def send_video(self, recipient: str, video_url: str, caption: str = None) -> Dict[str, Any]:
        """Send a video message."""
        data = {
            "device_uuid": self.device_uuid,
            "type_message": "video",
            "type_contact": "numbers",
            "ids": recipient,
            "media_url": video_url
        }
        if caption:
            data["text_message"] = caption
        return await self._request("/messages", data)
    
    async def send_message(self, recipient: str, message_type: str, content: str,
                           media_url: str = None, caption: str = None) -> Dict[str, Any]:
        """Send a message of any type."""
        if message_type == "text":
            return await self.send_text(recipient, content)
        elif message_type == "image":
            return await self.send_image(recipient, media_url or content, caption)
        elif message_type in ("voice", "audio"):
            return await self.send_voice(recipient, media_url or content)
        elif message_type == "document":
            return await self.send_document(recipient, media_url or content, caption)
        elif message_type == "video":
            return await self.send_video(recipient, media_url or content, caption)
        else:
            return {"success": False, "data": {"error": f"Unknown message type: {message_type}"}, "response_time_ms": 0}
    
    async def check_whatsapp(self, phone_number: str) -> Dict[str, Any]:
        """Check if a phone number is on WhatsApp."""
        return await self._request("/check-whatsapp", {
            "device_uuid": self.device_uuid,
            "phone": phone_number
        })
    
    async def health_check(self) -> Dict[str, Any]:
        """Check device health status."""
        # Use GET request for status check
        url = f"{self.BASE_URL}/devices/{self.device_uuid}/status"
        headers = {"x-api-token": self.api_token, "accept": "*/*"}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    try:
                        result = await response.json()
                    except:
                        result = {"raw_response": await response.text()}
                    return {
                        "success": response.status == 200,
                        "status_code": response.status,
                        "data": result
                    }
        except Exception as e:
            return {"success": False, "data": {"error": str(e)}}
