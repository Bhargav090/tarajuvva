import { WAITLIST_CONFIGS } from '../../utils/constants';
import VerticalWaitlistPage from '../../components/ui/VerticalWaitlistPage';
import donateVideo from '../../assets/donate.mp4';

export default function Donate() {
  return <VerticalWaitlistPage config={WAITLIST_CONFIGS.donate} heroVideo={donateVideo} />;
}
