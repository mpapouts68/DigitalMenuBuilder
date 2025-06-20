export function generateQRCode() {
  const currentURL = window.location.href;
  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentURL)}`;
  
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head>
          <title>Menu QR Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .container {
              text-align: center;
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            h2 {
              color: #1e293b;
              margin-bottom: 1rem;
            }
            img {
              border: 1px solid #e2e8f0;
              padding: 1rem;
              border-radius: 0.5rem;
              background: white;
            }
            p {
              color: #64748b;
              max-width: 300px;
              margin: 1rem auto;
              line-height: 1.5;
            }
            button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Scan to view menu</h2>
            <img src="${qrCodeURL}" alt="QR Code for menu" />
            <p>
              Point your phone's camera at this QR code to open the digital menu
            </p>
            <button onclick="window.print()">
              Print QR Code
            </button>
          </div>
        </body>
      </html>
    `);
  }
}
