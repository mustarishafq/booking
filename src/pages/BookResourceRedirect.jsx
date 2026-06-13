import { useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';

export default function BookResourceRedirect() {
  const { openBookingModal } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    openBookingModal?.(searchParams.get('resource') || '');
    navigate('/', { replace: true });
  }, [openBookingModal, navigate, searchParams]);

  return null;
}
