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

// Helper function to preprocess data for both PCA and t-SNE
function preprocessData(data, features) {
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
    return { matrix: [], validIndices: [], normalized: [] };
  }

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

  return { matrix, validIndices, normalized };
}

export function computePCA(data, features) {
  console.log('Computing PCA with features:', features);

  const { validIndices, normalized } = preprocessData(data, features);

  if (normalized.length === 0) {
    return { projection: [], validIndices: [] };
  }

  console.log(`Total rows: ${data.length}, Rows after preprocessing: ${normalized.length}`);

  // Run PCA with ml-pca library
  const pca = new PCA(normalized, { center: false, scale: false });
  const eigenvalues = pca.getEigenvalues();

  // Project onto PC1, PC2
  const projectionMatrix = pca.predict(normalized, { nComponents: 2 });

  const projection = [];
  for (let i = 0; i < projectionMatrix.rows; i++) {
    projection.push({
      x: projectionMatrix.get(i, 0),
      y: projectionMatrix.get(i, 1)
    });
  }

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

// t-SNE implementation
export function computeTSNE(data, features) {
  console.log('Computing t-SNE with features:', features);

  const { validIndices, normalized } = preprocessData(data, features);

  if (normalized.length === 0) {
    return { projection: [], validIndices: [] };
  }

  console.log(`Total rows: ${data.length}, Rows after preprocessing: ${normalized.length}`);

  const n = normalized.length;
  const perplexity = Math.min(30, Math.floor(n / 3));
  const learningRate = 200;
  const iterations = 1000;

  // Compute pairwise distances
  const distances = new Array(n);
  for (let i = 0; i < n; i++) {
    distances[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        continue;
      }
      let sum = 0;
      for (let k = 0; k < normalized[i].length; k++) {
        const diff = normalized[i][k] - normalized[j][k];
        sum += diff * diff;
      }
      distances[i][j] = sum;
    }
  }

  // Compute P matrix (high-dimensional affinities)
  const P = new Array(n);
  for (let i = 0; i < n; i++) {
    P[i] = new Array(n).fill(0);

    // Binary search for sigma
    let beta = 1.0;
    let betaMin = -Infinity;
    let betaMax = Infinity;
    const logU = Math.log(perplexity);

    for (let tries = 0; tries < 50; tries++) {
      let sumP = 0;
      let sumDp = 0;

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const pji = Math.exp(-distances[i][j] * beta);
          P[i][j] = pji;
          sumP += pji;
          sumDp += distances[i][j] * pji;
        }
      }

      if (sumP === 0) sumP = 1e-10;
      const H = Math.log(sumP) + beta * sumDp / sumP;
      const Hdiff = H - logU;

      if (Math.abs(Hdiff) < 1e-5) break;

      if (Hdiff > 0) {
        betaMin = beta;
        beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
      } else {
        betaMax = beta;
        beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
      }
    }

    // Normalize
    let sumP = 0;
    for (let j = 0; j < n; j++) {
      sumP += P[i][j];
    }
    for (let j = 0; j < n; j++) {
      P[i][j] = Math.max(P[i][j] / sumP, 1e-100);
    }
  }

  // Symmetrize P
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pij = (P[i][j] + P[j][i]) / (2 * n);
      P[i][j] = pij;
      P[j][i] = pij;
    }
  }

  // Initialize solution randomly
  const Y = new Array(n);
  for (let i = 0; i < n; i++) {
    Y[i] = [(Math.random() - 0.5) * 0.0001, (Math.random() - 0.5) * 0.0001];
  }

  const gains = new Array(n);
  const iY = new Array(n);
  for (let i = 0; i < n; i++) {
    gains[i] = [1, 1];
    iY[i] = [0, 0];
  }

  // Run gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    // Compute Q matrix (low-dimensional affinities)
    const Q = new Array(n);
    let sumQ = 0;

    for (let i = 0; i < n; i++) {
      Q[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        if (i === j) {
          Q[i][j] = 0;
          continue;
        }
        const dy0 = Y[i][0] - Y[j][0];
        const dy1 = Y[i][1] - Y[j][1];
        const dist = dy0 * dy0 + dy1 * dy1;
        Q[i][j] = 1 / (1 + dist);
        sumQ += Q[i][j];
      }
    }

    if (sumQ === 0) sumQ = 1e-10;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Q[i][j] = Math.max(Q[i][j] / sumQ, 1e-100);
      }
    }

    // Compute gradient
    const grad = new Array(n);
    for (let i = 0; i < n; i++) {
      grad[i] = [0, 0];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dy0 = Y[i][0] - Y[j][0];
        const dy1 = Y[i][1] - Y[j][1];
        const mult = (P[i][j] - Q[i][j]) * Q[i][j] * sumQ;
        grad[i][0] += mult * dy0;
        grad[i][1] += mult * dy1;
      }
      grad[i][0] *= 4;
      grad[i][1] *= 4;
    }

    // Update solution
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < 2; d++) {
        const gd = grad[i][d];
        const iy = iY[i][d];

        gains[i][d] = (Math.sign(gd) === Math.sign(iy))
          ? gains[i][d] * 0.8
          : gains[i][d] + 0.2;

        if (gains[i][d] < 0.01) gains[i][d] = 0.01;

        const momentum = iter < 250 ? 0.5 : 0.8;
        iY[i][d] = momentum * iy - learningRate * gains[i][d] * gd;
        Y[i][d] += iY[i][d];
      }
    }

    // Zero-mean
    if (iter % 10 === 0) {
      let meanX = 0, meanY = 0;
      for (let i = 0; i < n; i++) {
        meanX += Y[i][0];
        meanY += Y[i][1];
      }
      meanX /= n;
      meanY /= n;
      for (let i = 0; i < n; i++) {
        Y[i][0] -= meanX;
        Y[i][1] -= meanY;
      }
    }
  }

  const projection = Y.map(point => ({
    x: point[0],
    y: point[1]
  }));

  console.log(`t-SNE: Completed ${iterations} iterations`);

  return {
    projection,
    validIndices,
    features
  };
}
