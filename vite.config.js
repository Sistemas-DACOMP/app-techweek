import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sympla-dev-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/sympla/verify-ticket' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { email, ticketNumber } = JSON.parse(body || '{}');
                const token = process.env.SYMPLA_API_TOKEN || 'ea3f626667739b2909c1208ed0c15eac41f59b53313cce349e7abf837f57b9b8';
                const eventId = process.env.SYMPLA_EVENT_ID || '3575331';
                
                const symplaRes = await fetch(`https://api.sympla.com.br/public/v3/events/${eventId}/participants?page=1&page_size=100`, {
                  headers: { 's_token': token }
                });
                const data = await symplaRes.json();
                const participants = data?.data || [];
                const participant = participants.find(p => 
                  (email && p.email?.trim().toLowerCase() === email.trim().toLowerCase()) ||
                  (ticketNumber && p.ticket_number?.trim() === ticketNumber.trim())
                );
                
                res.setHeader('Content-Type', 'application/json');
                if (!participant) {
                  res.statusCode = 404;
                  return res.end(JSON.stringify({ status: 'not_found', verified: false, message: 'Ingresso não encontrado no Sympla.' }));
                }

                res.statusCode = 200;
                return res.end(JSON.stringify({
                  status: 'success',
                  verified: true,
                  participant: {
                    id: participant.id,
                    orderId: participant.order_id,
                    ticketNumber: participant.ticket_number,
                    ticketName: participant.ticket_name,
                    firstName: participant.first_name,
                    lastName: participant.last_name,
                    email: participant.email,
                    qrCodeData: participant.ticket_num_qr_code || participant.ticket_number,
                    checkInStatus: participant.checkin?.[0]?.check_in || false
                  }
                }));
              } catch (err) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                return res.end(JSON.stringify({ status: 'error', message: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  base: process.env.VITE_BASE_PATH || '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
})
