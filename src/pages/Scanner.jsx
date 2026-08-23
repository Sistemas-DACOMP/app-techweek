import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useUser } from '../hooks/useUser';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { registerCodeScan } = useUser();

  useEffect(() => {
    // Only initialize scanner if we haven't scanned successfully
    if (scanResult) return;

    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 10,
    });

    scanner.render(
      (result) => {
        scanner.clear();
        handleScan(result);
      },
      (error) => {
        // Ignored for UX, logs constantly when no QR is found
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [scanResult]);

  const handleScan = async (data) => {
<<<<<<< Updated upstream
    const result = await registerCodeScan(data, 5);

=======
    setIsLoading(true);

    let isUserQr = false;
    let usernameToValidate = null;

    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username) {
          isUserQr = true;
          usernameToValidate = parsed.username;
        }
      }
    } catch (e) {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username) {
            isUserQr = true;
            usernameToValidate = parsed.username;
          }
        }
      } catch (e2) {}
    }

    if (isUserQr && usernameToValidate) {
      // Validate with Supabase profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameToValidate)
        .single();
        
      if (error || !profile) {
        setIsLoading(false);
        setScanResult({ success: false, message: 'Usuário não encontrado no banco de dados. QR Code inválido.' });
        return;
      }
    }

    const result = registerCodeScan(data, 5);
    
>>>>>>> Stashed changes
    if (result && result.success) {
      if (result.unlockedChallenges && result.unlockedChallenges.length > 0) {
        setScanResult({ 
          success: true, 
          message: `Você ganhou +5 pontos! E completou missões de networking!`,
          challenges: result.unlockedChallenges
        });
      } else {
        setScanResult({ success: true, message: 'Você ganhou +5 pontos!' });
      }
    } else {
      setScanResult({ success: false, message: 'Você já escaneou este código.' });
    }

    setIsLoading(false);
  };

  const simulateScan = async () => {
    // 30% chance to simulate a special QR code
    const rand = Math.random();
    if (rand < 0.15) {
      handleScan('kanastra_code');
      return;
    }
    if (rand < 0.3) {
      handleScan('secret_qr_code');
      return;
    }

    try {
      // Try to fetch a real user to make simulation work with the new validation
      const { data: users, error } = await supabase
        .from('profiles')
        .select('username, course, participant_type, period')
        .limit(10);
        
      if (!error && users && users.length > 0) {
        const randomDbUser = users[Math.floor(Math.random() * users.length)];
        const payload = JSON.stringify({
          username: randomDbUser.username,
          course: randomDbUser.course,
          participantType: randomDbUser.participant_type,
          period: randomDbUser.period
        });
        handleScan(payload);
        return;
      }
    } catch (e) {
      console.error("Failed to fetch real users", e);
    }

    // Fallback to random if no DB connection or no users
    const mockUsernames = ['joao', 'maria', 'carlos', 'ana'];
    const mockCourses = ['Medicina', 'Sistemas de Informação', 'Engenharia', 'Letras'];
    const mockTypes = ['Aluno da UFU', 'Aluno de outra instituição', 'Servidor', 'Organizador'];
    
    const randomUser = mockUsernames[Math.floor(Math.random() * mockUsernames.length)];
    const randomCourse = mockCourses[Math.floor(Math.random() * mockCourses.length)];
    const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)];
    const randomPeriod = Math.floor(Math.random() * 8) + 1; // 1 to 8

    const payload = JSON.stringify({
      username: `${randomUser}_${Math.floor(Math.random() * 1000)}`,
      course: randomCourse,
      participantType: randomType,
      period: randomPeriod
    });

    handleScan(payload);
  };

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.5rem', marginTop: '16px' }}>Escanear QR Code</h2>
      
      {!scanResult ? (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Escaneie o QR Code de outro participante para ganhar 5 pontos!
          </p>
          
          <div id="reader" style={{ width: '100%', maxWidth: '300px', borderRadius: '12px', overflow: 'hidden' }}></div>
          
          <div style={{ marginTop: '24px', width: '100%' }}>
            <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>OU</div>
            <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={simulateScan} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simular Leitura (Para testes)'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          {scanResult.success ? (
            <div style={{ color: '#10b981', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={64} />
            </div>
          ) : (
            <div style={{ color: '#f59e0b', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertCircle size={64} />
            </div>
          )}
          
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            {scanResult.success ? 'Sucesso!' : 'Aviso'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{scanResult.message}</p>
          
          <button className="btn-primary" onClick={() => setScanResult(null)}>
            Escanear Outro
          </button>
        </div>
      )}
    </div>
  );
}
