import { WAITLIST_CONFIGS } from '../../utils/constants';
import VerticalWaitlistPage from '../../components/ui/VerticalWaitlistPage';

export default function Repair() {
  return <VerticalWaitlistPage config={WAITLIST_CONFIGS.repair} />;
}
