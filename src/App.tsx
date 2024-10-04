import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import BucketViewer from './components/BucketViewer';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BucketViewer />} />
        <Route path="/:prefix/*" element={<BucketViewer />} />
      </Routes>
    </Router>
  );
};

export default App;
