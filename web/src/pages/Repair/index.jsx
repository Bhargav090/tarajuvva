import { WAITLIST_CONFIGS } from '../../utils/constants';
import VerticalWaitlistPage from '../../components/ui/VerticalWaitlistPage';
import repairVideo from '../../assets/repair.tj.mp4';

export default function Repair() {
  return <VerticalWaitlistPage config={WAITLIST_CONFIGS.repair} heroVideo={repairVideo} />;
}
