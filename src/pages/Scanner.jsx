import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useUser } from '../hooks/useUser';
import { CheckCircle, AlertCircle, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { findUserByUsername, getLeaderboardUsers } from '../lib/userService';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { registerCodeScan } = useUser();

  useEffect(() => {
    // Only initialize scanner if we haven't scanned successfully
    if (scanResult) return;

    let isMounted = true;
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 10,
    });

    scanner.render(
      (result) => {
        if (!isMounted) return;
        scanner.clear();
        handleScan(result);
      },
      () => {
        // Ignored for UX, logs constantly when no QR is found
      }
    );

    return () => {
      isMounted = false;
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      // Fallback aggressively to stop video tracks
      const videoElement = document.querySelector('#reader video');
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanResult]);

  const handleScan = async (data) => {
    setIsLoading(true);

    let isUserQr = false;
    let usernameToValidate = null;
    let participantData = null;

    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username) {
          isUserQr = true;
          usernameToValidate = parsed.username;
          participantData = parsed;
        }
      }
    } catch {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username) {
            isUserQr = true;
            usernameToValidate = parsed.username;
            participantData = parsed;
          }
        }
      } catch {}
    }

    let fetchedProfile = null;
    if (isUserQr && usernameToValidate) {
      // Valida se o usuário existe no Firestore
      fetchedProfile = await findUserByUsername(usernameToValidate).catch(() => null);
        
      if (!fetchedProfile) {
        setIsLoading(false);
        setScanResult({ success: false, message: 'Usuário não encontrado no banco de dados. QR Code inválido.' });
        return;
      }
    }

    const result = await registerCodeScan(data, 5);
    const participantName = fetchedProfile?.displayName || participantData?.name || participantData?.username || usernameToValidate || 'Participante';
    const participantPhone = fetchedProfile?.phone || participantData?.phone || '34991234567';

    if (result && result.success) {
      setScanResult({ 
        success: true, 
        message: result.unlockedChallenges?.length > 0 
          ? 'Você ganhou +5 pontos! E completou missões de networking!' 
          : 'Você ganhou +5 pontos!',
        challenges: result.unlockedChallenges,
        participant: {
          name: participantName,
          phone: participantPhone,
          course: fetchedProfile?.course || participantData?.course || 'Ciência da Computação'
        }
      });
    } else {
      setScanResult({ 
        success: false, 
        message: 'Você já escaneou este código.',
        participant: isUserQr ? {
          name: participantName,
          phone: participantPhone,
          course: fetchedProfile?.course || participantData?.course || 'Computação'
        } : null
      });
    }

    setIsLoading(false);
  };

  const simulateScan = async () => {
    setIsLoading(true);
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
      const users = await getLeaderboardUsers(10).catch(() => []);
      if (users && users.length > 0) {
        const randomDbUser = users[Math.floor(Math.random() * users.length)];
        const payload = JSON.stringify({
          username: randomDbUser.username,
          name: randomDbUser.displayName || randomDbUser.firstName || randomDbUser.username,
          phone: randomDbUser.phone || '34998765432',
          course: randomDbUser.course,
          participantType: randomDbUser.participant_type || randomDbUser.participantType,
          period: randomDbUser.period
        });
        handleScan(payload);
        return;
      }

      const fallbackUser = {
        username: 'lucas_silva',
        name: 'Lucas Silva',
        phone: '(34) 99876-5432',
        course: 'Sistemas de Informação',
        participantType: 'Aluno da UFU',
        period: 4
      };
      handleScan(JSON.stringify(fallbackUser));
    } catch (e) {
      console.error("Failed to fetch real users for simulation", e);
    }

    const mockNames = ['Lucas Silva', 'Beatriz Lima', 'Gabriel Santos', 'Juliana Costa'];
    const mockCourses = ['Sistemas de Informação', 'Ciência da Computação', 'Engenharia de Software', 'Inteligência Artificial'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomCourse = mockCourses[Math.floor(Math.random() * mockCourses.length)];
    const randomPhone = `(34) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = JSON.stringify({
      username: randomName.toLowerCase().replace(' ', '_'),
      name: randomName,
      phone: randomPhone,
      course: randomCourse,
      participantType: 'Aluno da UFU',
      period: 3
    });

    handleScan(payload);
  };

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '90px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.5rem', marginTop: '16px', fontWeight: '800' }}>
        Escanear QR Code
      </h2>
      
      {!scanResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Escaneie o QR Code de outro participante para ganhar 5 pontos e desbloquear conexões!
            </p>
            
            <div id="reader" style={{ width: '100%', maxWidth: '300px', borderRadius: '12px', overflow: 'hidden' }}></div>
            
            <div style={{ marginTop: '24px', width: '100%' }}>
              <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>OU</div>
              <button className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={simulateScan} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Simular Leitura de Participante (Teste)'}
              </button>
            </div>
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
          
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', fontWeight: '800' }}>
            {scanResult.success ? 'Sucesso!' : 'Aviso'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{scanResult.message}</p>

          {/* Card do Lead com Botão WhatsApp se for participante */}
          {scanResult.participant && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.04)', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '20px', 
              textAlign: 'left',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#00f2fe', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>
                <UserCheck size={16} /> Lead Identificado
              </div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#ffffff', marginBottom: '4px' }}>
                {scanResult.participant.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {scanResult.participant.course} • {scanResult.participant.phone}
              </div>

              <WhatsAppButton
                phone={scanResult.participant.phone}
                participantName={scanResult.participant.name}
                companyName="TechWeek FACOM"
                fullWidth
              />
            </div>
          )}
          
          <button className="btn-primary" onClick={() => setScanResult(null)} style={{ width: '100%' }}>
            Escanear Outro
          </button>
        </div>
      )}
    </div>
  );
}
