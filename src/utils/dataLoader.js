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

  const matrix = [];
  const validIndices = [];

  for (let i = 0; i < n; i++) {
    const row = features.map(f => data[i][f]);
    if (row.every(v => v !== null && !isNaN(v))) {
      matrix.push(row);
      validIndices.push(i);
    }
  }

  if (matrix.length === 0) return { projection: [], validIndices: [] };

  const means = features.map((_, j) => {
    const sum = matrix.reduce((acc, row) => acc + row[j], 0);
    return sum / matrix.length;
  });

  const stds = features.map((_, j) => {
    const variance = matrix.reduce((acc, row) => acc + Math.pow(row[j] - means[j], 2), 0) / matrix.length;
    return Math.sqrt(variance) || 1;
  });

  const normalized = matrix.map(row =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );

  const cov = Array(m).fill(0).map(() => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < normalized.length; k++) {
        sum += normalized[k][i] * normalized[k][j];
      }
      cov[i][j] = sum / normalized.length;
    }
  }

  const pc1 = Array(m).fill(0);
  pc1[0] = 1;
  for (let iter = 0; iter < 50; iter++) {
    const newPc = Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        newPc[i] += cov[i][j] * pc1[j];
      }
    }
    const norm = Math.sqrt(newPc.reduce((sum, v) => sum + v * v, 0));
    for (let i = 0; i < m; i++) {
      pc1[i] = newPc[i] / norm;
    }
  }

  // Compute eigenvalue for PC1
  let lambda1 = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      lambda1 += cov[i][j] * pc1[i] * pc1[j];
    }
  }

  // Deflate covariance matrix properly
  const residualCov = Array(m).fill(0).map(() => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      residualCov[i][j] = cov[i][j] - lambda1 * pc1[i] * pc1[j];
    }
  }

  // Find PC2 orthogonal to PC1
  const pc2 = Array(m).fill(0);
  pc2[1] = 1;
  for (let iter = 0; iter < 100; iter++) {
    const newPc = Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        newPc[i] += residualCov[i][j] * pc2[j];
      }
    }
    // Orthogonalize against PC1
    const dot = newPc.reduce((sum, val, i) => sum + val * pc1[i], 0);
    for (let i = 0; i < m; i++) {
      newPc[i] -= dot * pc1[i];
    }
    const norm = Math.sqrt(newPc.reduce((sum, v) => sum + v * v, 0));
    if (norm < 1e-10) break;
    for (let i = 0; i < m; i++) {
      pc2[i] = newPc[i] / norm;
    }
  }

  // Compute variance explained
  let lambda2 = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      lambda2 += cov[i][j] * pc2[i] * pc2[j];
    }
  }
  const totalVar = cov.reduce((sum, row, i) => sum + row[i], 0);
  const varExplained1 = (lambda1 / totalVar) * 100;
  const varExplained2 = (lambda2 / totalVar) * 100;

  const projection = normalized.map(row => {
    const x = row.reduce((sum, val, i) => sum + val * pc1[i], 0);
    const y = row.reduce((sum, val, i) => sum + val * pc2[i], 0);
    return { x, y };
  });

  return {
    projection,
    validIndices,
    varExplained: [varExplained1, varExplained2],
    features: features
  };
}
