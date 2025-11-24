import { PCA } from 'ml-pca';

export async function loadFraminghamData() {
  const response = await fetch(`${import.meta.env.BASE_URL}framingham.csv`);
  const text = await response.text();

  // Handle different line endings: \r\n (Windows), \n (Unix), \r (Old Mac)
  const lines = text.trim().split(/\r\n|\n|\r/);
  const headers = ['male', 'age', 'education', 'currentSmoker', 'cigsPerDay', 'BPMeds',
                   'prevalentStroke', 'prevalentHyp', 'diabetes', 'totChol', 'sysBP',
                   'diaBP', 'BMI', 'heartRate', 'glucose', 'TenYearCHD'];

  const data = lines.map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      const value = values[i];
      if (value === 'NA' || value === '' || value === undefined) {
        obj[header] = null;
      } else {
        const num = Number(value);
        obj[header] = isNaN(num) ? value : num;
      }
    });
    return obj;
  });

  return { data, headers };
}

export function getFeatureMetadata() {
  return {
    male: { type: 'categorical', label: 'Sex', domain: [0, 1], labels: ['Female', 'Male'] },
    age: { type: 'numeric', label: 'Age', unit: 'years' },
    education: { type: 'ordinal', label: 'Education', domain: [1, 2, 3, 4] },
    currentSmoker: { type: 'categorical', label: 'Current Smoker', domain: [0, 1], labels: ['No', 'Yes'] },
    cigsPerDay: { type: 'numeric', label: 'Cigarettes Per Day', unit: 'cigs/day' },
    BPMeds: { type: 'categorical', label: 'BP Medication', domain: [0, 1], labels: ['No', 'Yes'] },
    prevalentStroke: { type: 'categorical', label: 'Prevalent Stroke', domain: [0, 1], labels: ['No', 'Yes'] },
    prevalentHyp: { type: 'categorical', label: 'Hypertension', domain: [0, 1], labels: ['No', 'Yes'] },
    diabetes: { type: 'categorical', label: 'Diabetes', domain: [0, 1], labels: ['No', 'Yes'] },
    totChol: { type: 'numeric', label: 'Total Cholesterol', unit: 'mg/dL' },
    sysBP: { type: 'numeric', label: 'Systolic BP', unit: 'mmHg' },
    diaBP: { type: 'numeric', label: 'Diastolic BP', unit: 'mmHg' },
    BMI: { type: 'numeric', label: 'BMI', unit: 'kg/m²' },
    heartRate: { type: 'numeric', label: 'Heart Rate', unit: 'bpm' },
    glucose: { type: 'numeric', label: 'Glucose', unit: 'mg/dL' },
    TenYearCHD: { type: 'categorical', label: '10-Year CHD', domain: [0, 1], labels: ['No', 'Yes'] }
  };
}

export function computePCA(data, features) {
  const n = data.length;
  const m = features.length;

  // 1) Compute column medians (ignoring nulls)
  const medians = features.map(f => {
    const vals = data
      .map(d => d[f])
      .filter(v => v !== null && !isNaN(v));
    const sorted = vals.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length === 0) return 0;
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  });

  console.log('Computing PCA with features:', features);
  console.log('Medians for imputation:', medians);

  // 2) Build matrix with median imputation
  const matrix = [];
  const validIndices = [];

  for (let i = 0; i < n; i++) {
    const row = [];
    let allMissing = true;
    for (let j = 0; j < m; j++) {
      const f = features[j];
      let v = data[i][f];
      if (v === null || isNaN(v)) {
        v = medians[j];
      } else {
        allMissing = false;
      }
      row.push(v);
    }
    if (!allMissing) {
      matrix.push(row);
      validIndices.push(i);
    }
  }

  if (matrix.length === 0) {
    return { projection: [], validIndices: [] };
  }

  console.log(`Total rows: ${n}, Rows after median imputation: ${matrix.length}`);

  // 3) Standardize (same as StandardScaler)
  const means = features.map((_, j) => {
    const sum = matrix.reduce((acc, row) => acc + row[j], 0);
    return sum / matrix.length;
  });

  const stds = features.map((_, j) => {
    const variance =
      matrix.reduce((acc, row) => acc + Math.pow(row[j] - means[j], 2), 0) /
      matrix.length;
    return Math.sqrt(variance) || 1;
  });

  const normalized = matrix.map(row =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  // 4) Run PCA with ml-pca library
  const pca = new PCA(normalized, { center: false, scale: false });

  const eigenvectorsMatrix = pca.getEigenvectors();
  const eigenvalues = pca.getEigenvalues();

  // Get eigenvectors as columns from the matrix
  const pc1 = [];
  const pc2 = [];
  for (let i = 0; i < m; i++) {
    pc1.push(eigenvectorsMatrix.get(i, 0));
    pc2.push(eigenvectorsMatrix.get(i, 1));
  }

  // 5) Project onto PC1, PC2
  const projection = normalized.map(row => {
    const x = row.reduce((sum, v, i) => sum + v * pc1[i], 0);
    const y = row.reduce((sum, v, i) => sum + v * pc2[i], 0);
    return { x, y };
  });

  const totalVar = eigenvalues.reduce((a, b) => a + b, 0);
  const varExplained1 = (eigenvalues[0] / totalVar) * 100;
  const varExplained2 = (eigenvalues[1] / totalVar) * 100;

  console.log(`PCA: PC1 explains ${varExplained1.toFixed(1)}%, PC2 explains ${varExplained2.toFixed(1)}%`);

  return {
    projection,
    validIndices,
    varExplained: [varExplained1, varExplained2],
    features
  };
}
