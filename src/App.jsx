import { useState, useEffect } from 'react';
import { loadFraminghamData, getFeatureMetadata, computePCA, computeUMAP } from './utils/dataLoader';
import FeatureDistribution from './components/FeatureDistribution';
import PCAView from './components/PCAView';
import SubgroupSummary from './components/SubgroupSummary';
import SubgroupComparison from './components/SubgroupComparison';
import './App.css';

export default function App() {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [projection, setProjection] = useState([]);
  const [validIndices, setValidIndices] = useState([]);
  const [pcaInfo, setPcaInfo] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [pinnedIndices, setPinnedIndices] = useState([]);
  const [colorFeature, setColorFeature] = useState('TenYearCHD');
  const [clusteringMethod, setClusteringMethod] = useState('PCA');
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: loadedData } = await loadFraminghamData();
      const meta = getFeatureMetadata();
      setData(loadedData);
      setMetadata(meta);

      // Use only continuous features for clustering (no categorical variables)
      const continuousFeatures = ['age', 'cigsPerDay', 'totChol', 'sysBP', 'diaBP',
                                  'BMI', 'heartRate', 'glucose'];
      const pcaResult = computePCA(loadedData, continuousFeatures);
      setProjection(pcaResult.projection);
      setValidIndices(pcaResult.validIndices);
      setPcaInfo({
        varExplained: pcaResult.varExplained,
        features: pcaResult.features
      });
    }
    loadData();
  }, []);

  // Recompute projection when clustering method changes
  useEffect(() => {
    if (!data) return;

    const computeProjection = async () => {
      setIsComputing(true);
      setSelectedIndices([]); // Clear selection when switching methods

      const continuousFeatures = ['age', 'cigsPerDay', 'totChol', 'sysBP', 'diaBP',
                                  'BMI', 'heartRate', 'glucose'];

      // Use setTimeout to allow loading indicator to appear
      setTimeout(() => {
        if (clusteringMethod === 'PCA') {
          const pcaResult = computePCA(data, continuousFeatures);
          setProjection(pcaResult.projection);
          setValidIndices(pcaResult.validIndices);
          setPcaInfo({
            varExplained: pcaResult.varExplained,
            features: pcaResult.features
          });
        } else if (clusteringMethod === 'UMAP') {
          const umapResult = computeUMAP(data, continuousFeatures);
          setProjection(umapResult.projection);
          setValidIndices(umapResult.validIndices);
          setPcaInfo({
            features: umapResult.features
          });
        }
        setIsComputing(false);
      }, 50);
    };

    computeProjection();
  }, [clusteringMethod, data]);

  const handleBrush = (indices) => {
    setSelectedIndices(indices);
  };

  const handlePin = () => {
    setPinnedIndices([...selectedIndices]);
  };

  const handleClearPin = () => {
    setPinnedIndices([]);
  };

  const handleClearSelection = () => {
    setSelectedIndices([]);
  };

  if (!data || !metadata) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading Framingham dataset...
      </div>
    );
  }

  const features = [
    'male', 'age', 'education', 'currentSmoker', 'cigsPerDay',
    'BPMeds', 'prevalentStroke', 'prevalentHyp', 'diabetes',
    'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose', 'TenYearCHD'
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Framingham Heart Study: Cohort Analysis Dashboard</h1>
          <p>Interactive multi-view exploration of cardiovascular risk factors</p>
        </div>
      </header>

      <div className="controls">
        <div className="control-group">
          <label>Clustering Method:</label>
          <select value={clusteringMethod} onChange={(e) => setClusteringMethod(e.target.value)} disabled={isComputing}>
            <option value="PCA">PCA</option>
            <option value="UMAP">UMAP</option>
          </select>
        </div>
        <div className="control-group">
          <label>Color by:</label>
          <select value={colorFeature} onChange={(e) => setColorFeature(e.target.value)}>
            {features.map(f => (
              <option key={f} value={f}>{metadata[f].label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
          <div className="status">
            {selectedIndices.length > 0 && (
              <span>Selected: {selectedIndices.length} participants</span>
            )}
            {pinnedIndices.length > 0 && (
              <span style={{ marginLeft: '15px' }}>Pinned: {pinnedIndices.length} participants</span>
            )}
          </div>
          <div className="control-group">
            <button onClick={handlePin} disabled={selectedIndices.length === 0}>
              Pin Selection
            </button>
            <button onClick={handleClearPin} disabled={pinnedIndices.length === 0}>
              Clear Pin
            </button>
            <button onClick={handleClearSelection} disabled={selectedIndices.length === 0}>
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard">
        <div className="panel panel-left">
          <h2>Feature Distributions</h2>
          <div className="feature-grid">
            {features.map(feature => (
              <div key={feature} className="feature-item">
                <FeatureDistribution
                  data={data}
                  feature={feature}
                  metadata={metadata}
                  selectedIndices={selectedIndices}
                  onBrush={handleBrush}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="panel panel-center">
          <PCAView
            data={data}
            projection={projection}
            validIndices={validIndices}
            colorFeature={colorFeature}
            metadata={metadata}
            selectedIndices={selectedIndices}
            onBrush={handleBrush}
            pcaInfo={pcaInfo}
            clusteringMethod={clusteringMethod}
            isComputing={isComputing}
          />
        </div>

        <div className="panel panel-right">
          <SubgroupSummary
            data={data}
            selectedIndices={selectedIndices}
            metadata={metadata}
          />
          <div style={{ marginTop: '20px' }}>
            <SubgroupComparison
              data={data}
              selectedIndices={selectedIndices}
              pinnedIndices={pinnedIndices}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
