import { CampusOpsScreen } from './src/campusops/ui/CampusOpsScreen';
import { campusOpsDependencies } from './src/composition/campusOpsDependencies';

export default function App() {
  return <CampusOpsScreen {...campusOpsDependencies} />;
}
