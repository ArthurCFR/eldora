/**
 * Proxy server for Anthropic API and LiveKit token generation
 */
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// LiveKit token generation endpoint
app.post('/api/livekit-token', async (req, res) => {
  try {
    const { roomName, participantName, metadata } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'roomName and participantName are required'
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit API credentials not configured');
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      metadata: metadata || JSON.stringify({
        userName: participantName,
        timestamp: new Date().toISOString()
      }),
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    res.json({
      token,
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
      roomName,
    });
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate LiveKit token'
    });
  }
});

app.post('/api/generate-report', async (req, res) => {
  try {
    const { transcript, visit } = req.body;

    // Detect if this is an analysis request based on the transcript content
    const isAnalysisRequest = transcript.includes('Analyse la transcription et extrait les informations');

    let prompt;
    if (isAnalysisRequest) {
      // Use the transcript as-is for analysis requests
      prompt = transcript;
    } else {
      // Generate regular report prompt
      prompt = `Tu es un assistant médical spécialisé dans la rédaction de rapports de visite pharmaceutique.

Informations de la visite :
- Pharmacie : ${visit.pharmacyName}
- Adresse : ${visit.address}
- Date : ${new Date(visit.date).toLocaleDateString('fr-FR')}
- Commercial : ${visit.userName}

Transcription de l'entretien :
${transcript}

Génère un rapport de visite professionnel et structuré en français, incluant :
1. Résumé de la visite
2. Points clés discutés
3. Besoins identifiés
4. Actions à suivre
5. Prochaines étapes

Format le rapport de manière claire et professionnelle.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Claude API Error Response:', JSON.stringify(error, null, 2));

      // Handle different error structures from Claude API
      const errorMessage = error.error?.message ||
                          error.message ||
                          JSON.stringify(error) ||
                          'Unknown error';
      throw new Error(`Claude API error: ${errorMessage}`);
    }

    const data = await response.json();
    const report = data.content[0].text;

    res.json({ report });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate report'
    });
  }
});

// Endpoint dédié pour le moteur conversationnel
app.post('/api/claude', async (req, res) => {
  try {
    const { model, max_tokens, messages } = req.body;

    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 2048,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Claude API Error Response:', JSON.stringify(error, null, 2));

      // Handle different error structures from Claude API
      const errorMessage = error.error?.message ||
                          error.message ||
                          JSON.stringify(error) ||
                          'Unknown error';
      throw new Error(`Claude API error: ${errorMessage}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({
      error: error.message || 'Failed to call Claude API'
    });
  }
});

// ============================================
// PROJECT MANAGEMENT ENDPOINTS
// ============================================
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const PROJECTS_DIR = path.join(__dirname, 'data', 'projects');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const projectId = req.params.projectId;
    const uploadDir = path.join(PROJECTS_DIR, projectId, 'documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// List all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await fs.readdir(PROJECTS_DIR);
    const projectList = [];

    for (const projectId of projects) {
      if (projectId.startsWith('.')) continue; // Skip hidden files

      const configPath = path.join(PROJECTS_DIR, projectId, 'config.json');
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        projectList.push({
          id: config.id,
          name: config.name,
          description: config.description,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          industry: config.settings?.industry || 'unknown',
        });
      } catch (err) {
        console.warn(`Skipping invalid project: ${projectId}`);
      }
    }

    res.json(projectList);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Get specific project
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const configPath = path.join(PROJECTS_DIR, projectId, 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Try to load products if they exist
    const productsPath = path.join(PROJECTS_DIR, projectId, 'products.json');
    try {
      const productsData = await fs.readFile(productsPath, 'utf-8');
      config.products = JSON.parse(productsData);
    } catch (err) {
      config.products = [];
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(404).json({ error: 'Project not found' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const {
      name,
      description,
      companyContext,
      reportContext,
      reportGoal,
      startDate,
      settings
    } = req.body;

    // Generate project ID from name
    const projectId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Check if project already exists
    try {
      await fs.access(projectDir);
      return res.status(400).json({ error: 'Project already exists' });
    } catch (err) {
      // Project doesn't exist, good to continue
    }

    // Create project directory structure
    await fs.mkdir(path.join(projectDir, 'reports'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'documents'), { recursive: true });

    // Create initial config
    const config = {
      id: projectId,
      name,
      description,
      companyContext: companyContext || '',
      reportContext: reportContext || '',
      reportGoal: reportGoal || '',
      startDate: startDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        industry: settings?.industry || 'general',
        reportType: settings?.reportType || 'visit',
        language: settings?.language || 'fr',
        reportScheduleType: settings?.reportScheduleType || 'fixed',
        reportFrequency: settings?.reportFrequency || 'daily',
      },
      conversationStyle: 'professional_warm',
      attentionPoints: [],
      reportTemplate: {
        sections: ['summary', 'details', 'insights']
      }
    };

    await fs.writeFile(
      path.join(projectDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    res.json(config);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    const configPath = path.join(PROJECTS_DIR, projectId, 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Update fields
    const updatedConfig = {
      ...config,
      ...updates,
      id: projectId, // Never change ID
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Recursive delete
    await fs.rm(projectDir, { recursive: true, force: true });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Upload document
app.post('/api/projects/:projectId/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.params;
    const documentId = `doc-${Date.now()}`;

    let parsedData = null;

    // Parse Excel if file is .xlsx or .xls
    if (req.file.originalname.match(/\.(xlsx|xls)$/i)) {
      try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length >= 2) {
          const headers = jsonData[0];
          const products = [];

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0) continue;

            const product = {};
            headers.forEach((header, index) => {
              if (row[index] !== undefined && row[index] !== null) {
                product[header] = row[index];
              }
            });

            if (!product.id) {
              product.id = `prod-${i}`;
            }

            products.push(product);
          }

          parsedData = products;

          // Save parsed products to project
          const productsPath = path.join(PROJECTS_DIR, projectId, 'products.json');
          await fs.writeFile(productsPath, JSON.stringify(products, null, 2));
        }
      } catch (parseError) {
        console.warn('Failed to parse Excel:', parseError);
      }
    }

    res.json({
      documentId,
      name: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date().toISOString(),
      parsedData,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Analyze project with AI
app.post('/api/projects/:projectId/analyze', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { description, documents } = req.body;

    // Load project config
    const configPath = path.join(PROJECTS_DIR, projectId, 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Load products if available
    let productsData = [];
    const productsPath = path.join(PROJECTS_DIR, projectId, 'products.json');
    try {
      const products = await fs.readFile(productsPath, 'utf-8');
      productsData = JSON.parse(products);
    } catch (err) {
      // No products yet
    }

    // Build prompt for AI
    let prompt = `Tu es un expert en conception d'assistants conversationnels pour les commerciaux.

**Contexte du projet :**
Nom : ${config.name}
Description : ${description}

`;

    if (productsData.length > 0) {
      prompt += `**Produits/Catalogue :**
${JSON.stringify(productsData.slice(0, 5), null, 2)}
${productsData.length > 5 ? `... et ${productsData.length - 5} autres produits` : ''}

`;
    }

    prompt += `**Ta mission :**
Analyse ce projet et propose une configuration optimale pour un assistant vocal qui aidera les commerciaux à créer des rapports.

**Tu dois générer (en JSON strict) :**
1. **attentionPoints** : 3-6 points d'attention clés que l'assistant doit aborder dans la conversation
   - Chaque point doit avoir : id, description, priority ("high"/"medium"/"low")

2. **conversationStyle** : Le style de conversation approprié (ex: "professional_warm", "friendly_colleague", "formal_business")

3. **reportTemplate** : Les sections que le rapport devra contenir (array de strings)

4. **suggestions** : 2-3 suggestions pour optimiser l'utilisation

**Format de réponse (JSON strict, rien d'autre) :**
\`\`\`json
{
  "attentionPoints": [...],
  "conversationStyle": "professional_warm",
  "reportTemplate": { "sections": [...] },
  "suggestions": [...]
}
\`\`\`

Génère maintenant la configuration pour ce projet.`;

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await claudeResponse.json();
    const analysisText = data.content[0].text;

    // Parse JSON response
    const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) ||
                      analysisText.match(/```\n([\s\S]*?)\n```/) ||
                      [null, analysisText];
    const jsonText = jsonMatch[1] || analysisText;
    const analysis = JSON.parse(jsonText.trim());

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing project:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze project',
      // Fallback configuration
      attentionPoints: [
        {
          id: 'general_info',
          description: 'Informations générales',
          priority: 'high',
        },
      ],
      conversationStyle: 'professional_warm',
      reportTemplate: { sections: ['summary', 'details'] },
      suggestions: ['Configuration par défaut - personnalisez selon vos besoins'],
    });
  }
});

// Analyze and enrich product field metadata with AI
app.post('/api/analyze-product-fields', async (req, res) => {
  try {
    const { fields, projectContext } = req.body;

    if (!fields || fields.length === 0) {
      return res.status(400).json({ error: 'fields are required' });
    }

    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    const prompt = `Tu es un expert en analyse de données produits.

CONTEXTE DU PROJET:
- Nom: ${projectContext.name}
- Description: ${projectContext.description}
- Industrie: ${projectContext.industry}

CHAMPS DE PRODUITS À ANALYSER:
${fields.map(f => `- ${f.fieldName} (${f.displayName}) [${f.type}] - Exemples: ${f.sampleValues?.join(', ') || 'N/A'}`).join('\n')}

**Ta mission:**
Pour chaque champ, génère une description concise (10-20 mots) expliquant ce que ce champ représente dans le contexte métier du projet.

**Format de réponse (JSON strict):**
{
  "fields": [
    {
      "fieldName": "nom_du_champ",
      "displayName": "Nom Affiché",
      "type": "text|number|currency|percentage|date",
      "description": "Description concise et pertinente",
      "sampleValues": ["valeur1", "valeur2"]
    }
  ]
}

Génère maintenant les descriptions enrichies pour ces champs.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Claude API Error Response:', JSON.stringify(error, null, 2));

      // Handle different error structures from Claude API
      const errorMessage = error.error?.message ||
                          error.message ||
                          JSON.stringify(error) ||
                          'Unknown error';
      throw new Error(`Claude API error: ${errorMessage}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text.trim();

    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const enrichedData = JSON.parse(responseText);
    res.json(enrichedData);
  } catch (error) {
    console.error('Field analysis error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze fields'
    });
  }
});

// Generate table structure with AI
app.post('/api/generate-table-structure', async (req, res) => {
  try {
    const { projectContext, products, fieldMetadata } = req.body;

    if (!projectContext || !products || products.length === 0) {
      return res.status(400).json({ error: 'projectContext and products are required' });
    }

    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    const sampleProduct = products[0];
    const availableFields = Object.keys(sampleProduct);

    // Build field metadata info for the prompt
    let fieldsInfo = '';
    if (fieldMetadata && fieldMetadata.length > 0) {
      fieldsInfo = `\n**CHAMPS DISPONIBLES DANS L'EXCEL (${fieldMetadata.length} champs au total):**\n`;
      fieldsInfo += fieldMetadata.map(f =>
        `- ${f.fieldName} (${f.displayName}) [${f.type}]${f.description ? ': ' + f.description : ''} - Exemples: ${f.sampleValues?.join(', ') || 'N/A'}`
      ).join('\n');
      fieldsInfo += '\n\n⚠️ IMPORTANT: Toutes ces informations seront disponibles pour l\'IA dans les conversations. Tu dois choisir uniquement les 4-5 colonnes LES PLUS PERTINENTES pour l\'affichage dans le rapport.\n';
    } else {
      fieldsInfo = `\n**CHAMPS DISPONIBLES:**\n${availableFields.join(', ')}\n`;
    }

    const prompt = `Tu es un expert en analyse de données et en conception de tableaux de suivi.

CONTEXTE DU PROJET:
- Nom: ${projectContext.name}
- Description: ${projectContext.description}
- Industrie: ${projectContext.industry}
- Type de rapport: ${projectContext.reportType}

PRODUITS DISPONIBLES (${products.length} produits):
Exemple de produit: ${JSON.stringify(sampleProduct, null, 2)}
${fieldsInfo}

CONSIGNES:
1. Propose une structure de tableau optimale pour tracker les performances de vente/activité
2. Maximum 5 colonnes AFFICHÉES (incluant le nom du produit)
3. La première colonne DOIT TOUJOURS être "product_name" avec le nom du produit
4. Choisis les colonnes les plus pertinentes pour l'AFFICHAGE dans un rapport d'activité
5. Pour les colonnes "product" source, utilise le "fieldName" exact depuis l'Excel (si disponible dans fieldMetadata)
6. Pense aux métriques qui apportent vraiment de la valeur visuelle

IMPORTANT: Toutes les informations de l'Excel seront disponibles pour l'IA conversationnelle. Tu choisis juste ce qui sera AFFICHÉ dans le tableau du rapport.

⚠️ RÈGLE CRITIQUE - COLONNES CALCULÉES ET OBJECTIFS:
- N'ajoute une colonne "Objectif" QUE si les produits ont EXPLICITEMENT un champ objectif/target dans l'Excel
- N'ajoute une colonne calculée (ratio, %) QUE si elle a vraiment du sens pour ce projet
- Si le projet est simple (tracking de ventes basiques), reste sur: Produit, Quantité, Prix (optionnel)
- Ne force JAMAIS des colonnes "Objectif" ou "Score" si elles ne sont pas pertinentes

EXEMPLES PAR CONTEXTE:
- Tracking ventes simple → Produit, Quantité vendue, Prix unitaire (optionnel)
- Équipement pro/B2B → Produit, Quantité, Date livraison, Notes (optionnel)
- Pharma avec objectifs → Produit, Unités, Objectif, Taux de réussite (%)
- Retail avec zones → Produit, Quantité, Zone géographique, Prix total

Réponds UNIQUEMENT avec un JSON valide au format suivant (sans markdown):
{
  "description": "Description concise de ce que ce tableau track",
  "columns": [
    {
      "id": "product_name",
      "label": "Produit",
      "type": "text",
      "source": "product",
      "required": true
    },
    {
      "id": "quantity_sold",
      "label": "Quantité vendue",
      "type": "number",
      "source": "sales",
      "required": true
    }
  ],
  "fieldMapping": {
    "product_name": "name",
    "quantity_sold": "quantity_sold"
  }
}

TYPES DISPONIBLES: "text", "number", "currency", "percentage", "date"
SOURCES DISPONIBLES:
- "product" (données depuis l'Excel uploadé - utilise le fieldName exact)
- "sales" (données collectées pendant la conversation avec l'agent)
- "calculated" (colonnes calculées automatiquement)

Pour les colonnes calculées, ajoute un champ "calculation" avec la formule (ex: "quantity_sold * Prix")
Pour les colonnes "product" source, ajoute dans fieldMapping le mapping entre l'id de la colonne et le fieldName exact de l'Excel.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Claude API Error Response:', JSON.stringify(error, null, 2));

      // Handle different error structures from Claude API
      const errorMessage = error.error?.message ||
                          error.message ||
                          JSON.stringify(error) ||
                          'Unknown error';
      throw new Error(`Claude API error: ${errorMessage}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text.trim();

    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const tableStructure = JSON.parse(responseText);

    // Validate
    if (!tableStructure.columns || tableStructure.columns.length === 0) {
      throw new Error('No columns generated');
    }

    if (tableStructure.columns.length > 5) {
      throw new Error('Too many columns (max 5)');
    }

    if (tableStructure.columns[0].id !== 'product_name') {
      throw new Error('First column must be product_name');
    }

    res.json(tableStructure);
  } catch (error) {
    console.error('Table structure generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate table structure'
    });
  }
});

// ============================================
// REPORTS BY DATE ENDPOINTS
// ============================================

// Get all reports for a project
app.get('/api/projects/:projectId/reports', async (req, res) => {
  try {
    const { projectId } = req.params;
    const reportsDir = path.join(PROJECTS_DIR, projectId, 'reports');

    // Check if reports directory exists
    try {
      await fs.access(reportsDir);
    } catch (err) {
      // No reports directory yet
      return res.json([]);
    }

    const reportFiles = await fs.readdir(reportsDir);
    const reports = [];

    for (const filename of reportFiles) {
      if (!filename.endsWith('.json')) continue;

      try {
        const reportPath = path.join(reportsDir, filename);
        const reportData = await fs.readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportData);
        reports.push(report);
      } catch (err) {
        console.warn(`Skipping invalid report file: ${filename}`);
      }
    }

    // Sort by date (most recent first)
    reports.sort((a, b) => b.date.localeCompare(a.date));

    res.json(reports);
  } catch (error) {
    console.error('Error getting project reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get a specific report by date and user
app.get('/api/projects/:projectId/reports/date/:date', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    const { userName } = req.query; // Get userName from query params

    if (!userName) {
      return res.status(400).json({ error: 'userName query parameter is required' });
    }

    const reportPath = path.join(PROJECTS_DIR, projectId, 'reports', `${date}_${userName}.json`);

    try {
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportData);
      res.json(report);
    } catch (err) {
      // Report not found
      res.status(404).json({ error: 'Report not found for this date and user' });
    }
  } catch (error) {
    console.error('Error getting report by date:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Create or update a report for a specific date
app.post('/api/projects/:projectId/reports', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      date,
      userName,
      eventName,
      sales,
      salesAmounts,
      totalAmount,
      customerFeedback,
      keyInsights,
      emotionalContext,
    } = req.body;

    if (!date || !userName) {
      return res.status(400).json({ error: 'date and userName are required' });
    }

    const reportsDir = path.join(PROJECTS_DIR, projectId, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    // Use userName in filename to separate reports by user
    const reportPath = path.join(reportsDir, `${date}_${userName}.json`);

    // Check if report already exists
    let existingReport = null;
    try {
      const existingData = await fs.readFile(reportPath, 'utf-8');
      existingReport = JSON.parse(existingData);
    } catch (err) {
      // Report doesn't exist yet
    }

    const now = new Date().toISOString();
    const reportId = existingReport?.id || `rep-${Date.now()}-${userName}`;

    const report = {
      id: reportId,
      projectId,
      date,
      userName,
      eventName: eventName || '',
      sales: sales || {},
      salesAmounts: salesAmounts || {},
      totalAmount: totalAmount || 0,
      customerFeedback: customerFeedback || '',
      keyInsights: keyInsights || [],
      emotionalContext: emotionalContext || null,
      createdAt: existingReport?.createdAt || now,
      updatedAt: now,
      sentAt: existingReport?.sentAt || null,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    res.json(report);
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// Delete a report by date and user
app.delete('/api/projects/:projectId/reports/date/:date', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    const { userName } = req.query; // Get userName from query params

    if (!userName) {
      return res.status(400).json({ error: 'userName query parameter is required' });
    }

    const reportPath = path.join(PROJECTS_DIR, projectId, 'reports', `${date}_${userName}.json`);

    await fs.unlink(reportPath);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Report not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete report' });
    }
  }
});

// Send/finalize a report
app.post('/api/projects/:projectId/reports/:reportId/send', async (req, res) => {
  try {
    const { projectId, reportId } = req.params;
    const reportsDir = path.join(PROJECTS_DIR, projectId, 'reports');

    // Find the report file with this ID
    const reportFiles = await fs.readdir(reportsDir);
    let targetFile = null;

    for (const filename of reportFiles) {
      if (!filename.endsWith('.json')) continue;

      const reportPath = path.join(reportsDir, filename);
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportData);

      if (report.id === reportId) {
        targetFile = reportPath;
        report.sentAt = new Date().toISOString();
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        return res.json(report);
      }
    }

    res.status(404).json({ error: 'Report not found' });
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({ error: 'Failed to send report' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
