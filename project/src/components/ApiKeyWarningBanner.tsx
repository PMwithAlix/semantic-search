import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ErrorGuidancePanel } from '@/components/ErrorGuidancePanel';

export function ApiKeyWarningBanner() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.getSettingsStatus()
      .then((status) => setMissing(!status.avalai_configured))
      .catch(() => setMissing(false));
  }, []);

  if (!missing) return null;

  return (
    <div className="mb-4">
      <ErrorGuidancePanel message="AvalAI API key is not configured" />
    </div>
  );
}
