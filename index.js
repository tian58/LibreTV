// login.js
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  
  // �����豸ָ��
  const deviceId = await generateDeviceId();
  
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, deviceId }),
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem("auth_token", token);
    window.location.href = "/dashboard";
  } else {
    alert("Login failed: " + await response.text());
  }
}

// �����豸ָ��
async function generateDeviceId() {
  // ʹ��Canvasָ�ơ��������Ϣ������ΨһID
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Canvas fingerprinting", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("Canvas fingerprinting", 4, 17);
  
  const fingerprint = canvas.toDataURL();
  const hash = await sha256(fingerprint);
  return hash;
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}