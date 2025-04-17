import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// UID fixo do admin (proteção nas rotas)
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase SDK Initialization
try {
  const firebaseConfigJson = process.env.FIREBASE_ADMIN_SDK;

  if (!firebaseConfigJson) throw new Error("FIREBASE_ADMIN_SDK está vazia!");

  const serviceAccount = JSON.parse(firebaseConfigJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase inicializado com sucesso!');
} catch (err) {
  console.error('Erro ao inicializar Firebase:', err.message);
}

// Firestore Database
const db = admin.firestore();

// Middleware para autenticação avançada com Firebase Token
async function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const requestTimestamp = Date.now();
  
  // Registrar tentativa de acesso à API (para monitoramento)
  console.log(`Tentativa de acesso à API - IP: ${clientIP}, User-Agent: ${userAgent}, Endpoint: ${req.originalUrl}`);
  
  // Verificar se o cabeçalho de autorização está presente
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Registrar erro de autenticação
    console.warn(`Erro de autenticação: Token não fornecido ou inválido - IP: ${clientIP}`);
    
    // Registrar no Firestore para auditoria
    try {
      await db.collection('security_logs').add({
        tipo: 'auth_header_ausente',
        detalhes: 'Token não fornecido ou formato inválido',
        ip: clientIP,
        userAgent: userAgent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.originalUrl,
        method: req.method
      });
    } catch (logError) {
      console.error('Erro ao registrar log de segurança:', logError);
    }
    
    return res.status(401).json({ 
      error: 'Token de autenticação não fornecido ou formato inválido',
      code: 'AUTH_HEADER_MISSING'
    });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verificar se o UID esperado está presente no cabeçalho
    const uidHeader = req.headers['x-admin-uid'];
    
    // Verificar nonce para evitar replay attacks (se presente)
    const nonceHeader = req.headers['x-request-nonce'];
    if (nonceHeader) {
      // Verificar se este nonce já foi usado antes (limite de 24h para armazenar nonces usados)
      const nonceDoc = await db.collection('used_nonces').doc(nonceHeader).get();
      if (nonceDoc.exists) {
        console.warn(`Tentativa de replay attack detectada: reutilização de nonce ${nonceHeader} - IP: ${clientIP}`);
        
        // Registrar tentativa de replay no Firestore
        try {
          await db.collection('security_logs').add({
            tipo: 'replay_attack',
            detalhes: `Tentativa de reutilização de nonce: ${nonceHeader}`,
            ip: clientIP,
            userAgent: userAgent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            endpoint: req.originalUrl,
            method: req.method
          });
        } catch (logError) {
          console.error('Erro ao registrar log de segurança:', logError);
        }
        
        return res.status(403).json({ 
          error: 'Acesso negado. Requisição já processada ou inválida.',
          code: 'REPLAY_ATTACK'
        });
      }
      
      // Armazenar o nonce usado para evitar futura reutilização
      await db.collection('used_nonces').doc(nonceHeader).set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: clientIP,
        endpoint: req.originalUrl
      });
    }
    
    // Verificação do timestamp da requisição (se presente)
    const requestTimestampHeader = req.headers['x-request-timestamp'];
    if (requestTimestampHeader) {
      const headerTimestamp = parseInt(requestTimestampHeader);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      // Se a diferença for maior que 5 minutos, rejeitar (possível replay attack)
      if (!isNaN(headerTimestamp) && Math.abs(currentTimestamp - headerTimestamp) > 300) {
        console.warn(`Requisição com timestamp suspeito - IP: ${clientIP}, Diferença: ${Math.abs(currentTimestamp - headerTimestamp)}s`);
        
        // Registrar no Firestore
        try {
          await db.collection('security_logs').add({
            tipo: 'timestamp_invalido',
            detalhes: `Timestamp suspeito na requisição: ${headerTimestamp} vs ${currentTimestamp}`,
            ip: clientIP,
            userAgent: userAgent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            endpoint: req.originalUrl,
            method: req.method
          });
        } catch (logError) {
          console.error('Erro ao registrar log de segurança:', logError);
        }
        
        return res.status(403).json({ 
          error: 'Acesso negado. Timestamp da requisição inválido.',
          code: 'INVALID_TIMESTAMP'
        });
      }
    }
    
    // Verificar se o UID no cabeçalho é válido
    if (uidHeader !== ADMIN_UID) {
      // Registrar tentativa suspeita com UID incorreto no cabeçalho
      console.warn(`Tentativa suspeita: UID incorreto no cabeçalho - IP: ${clientIP}, UID: ${uidHeader}`);
      
      // Registrar no Firestore para auditoria
      try {
        await db.collection('security_logs').add({
          tipo: 'acesso_suspeito',
          detalhes: 'UID incorreto no cabeçalho',
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          uid_fornecido: uidHeader || 'não fornecido',
          uid_esperado: ADMIN_UID,
          endpoint: req.originalUrl,
          method: req.method
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(403).json({ 
        error: 'Acesso negado. Cabeçalho de autorização inválido.',
        code: 'INVALID_ADMIN_HEADER'
      });
    }
    
    // Verificar o token com o Firebase Admin SDK (com check de revogação)
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    
    // Verificações de segurança adicionais
    
    // 1. Verificar se o token foi emitido no futuro (possível manipulação)
    const tokenIssuedAt = decodedToken.iat * 1000; // Converter para milissegundos
    const currentTime = Date.now();
    const timeBuffer = 60000; // 1 minuto de tolerância para pequenas diferenças de relógio
    
    if (tokenIssuedAt > currentTime + timeBuffer) {
      console.warn(`Token com timestamp futuro detectado - IP: ${clientIP}, UID: ${decodedToken.uid}, Diferença: ${(tokenIssuedAt - currentTime) / 1000}s`);
      
      // Registrar no Firestore
      try {
        await db.collection('security_logs').add({
          tipo: 'token_futuro',
          detalhes: `Token emitido no futuro: ${new Date(tokenIssuedAt).toISOString()} vs ${new Date(currentTime).toISOString()}`,
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          uid: decodedToken.uid,
          email: decodedToken.email || 'não disponível',
          endpoint: req.originalUrl,
          method: req.method
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(401).json({ 
        error: 'Token inválido. Possível manipulação de data/hora detectada.',
        code: 'INVALID_TOKEN_TIME'
      });
    }
    
    // 2. Verificar se o token não está expirado
    const tokenExpirationTime = decodedToken.exp * 1000; // Converter para milissegundos
    
    if (tokenExpirationTime < currentTime) {
      console.warn(`Token expirado - IP: ${clientIP}, UID: ${decodedToken.uid}`);
      
      // Registrar no Firestore
      try {
        await db.collection('security_logs').add({
          tipo: 'token_expirado',
          detalhes: `Token expirado em ${new Date(tokenExpirationTime).toISOString()}`,
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          uid: decodedToken.uid,
          email: decodedToken.email || 'não disponível',
          endpoint: req.originalUrl,
          method: req.method
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(401).json({ 
        error: 'Token expirado, faça login novamente',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // 3. Verificar se o tempo desde a última autenticação não é muito grande (forçar re-login periódico)
    const authTime = decodedToken.auth_time * 1000; // Converter para milissegundos
    const maxAuthAge = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
    
    if (currentTime - authTime > maxAuthAge) {
      console.warn(`Sessão de autenticação muito antiga - IP: ${clientIP}, UID: ${decodedToken.uid}, Idade: ${(currentTime - authTime) / (60 * 60 * 1000)}h`);
      
      // Registrar no Firestore
      try {
        await db.collection('security_logs').add({
          tipo: 'sessao_antiga',
          detalhes: `Autenticação realizada há mais de 24h: ${new Date(authTime).toISOString()}`,
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          uid: decodedToken.uid,
          email: decodedToken.email || 'não disponível',
          endpoint: req.originalUrl,
          method: req.method
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(401).json({ 
        error: 'Sessão expirada, faça login novamente',
        code: 'SESSION_EXPIRED'
      });
    }
    
    // 4. Verificar se o UID do token corresponde ao UID do admin
    if (decodedToken.uid !== ADMIN_UID) {
      // Registrar tentativa de acesso não autorizado
      console.warn(`Acesso negado: UID incorreto no token - IP: ${clientIP}, UID: ${decodedToken.uid}`);
      
      // Registrar no Firestore
      try {
        await db.collection('security_logs').add({
          tipo: 'acesso_negado',
          detalhes: 'UID incorreto no token JWT',
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          uid_token: decodedToken.uid,
          uid_esperado: ADMIN_UID,
          email: decodedToken.email || 'não disponível',
          endpoint: req.originalUrl,
          method: req.method
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(403).json({ 
        error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // 3. Verificações adicionais (email verificado, etc)
    if (!decodedToken.email_verified) {
      console.warn(`Aviso: Email não verificado - UID: ${decodedToken.uid}, Email: ${decodedToken.email}`);
    }
    
    // Log de acesso bem-sucedido (opcional, pode ser removido em produção para reduzir ruído)
    console.log(`Acesso autenticado: ${decodedToken.email} (${decodedToken.uid}) - Endpoint: ${req.originalUrl}`);
    
    // Adicionar o usuário autenticado ao objeto de requisição
    req.user = decodedToken;
    
    // Passar para o próximo middleware
    next();
  } catch (error) {
    console.error(`Erro ao verificar token - IP: ${clientIP}:`, error);
    
    // Registrar erro de autenticação no Firestore
    try {
      await db.collection('security_logs').add({
        tipo: 'erro_autenticacao',
        detalhes: error.message,
        ip: clientIP,
        userAgent: userAgent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.originalUrl,
        method: req.method
      });
    } catch (logError) {
      console.error('Erro ao registrar log de segurança:', logError);
    }
    
    // Mensagem de erro genérica por segurança
    return res.status(401).json({ 
      error: 'Falha na autenticação. Token inválido ou expirado.', 
      code: 'INVALID_TOKEN' 
    });
  }
}

// Rotas para servir arquivos HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/loja', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loja.html'));
});

app.get('/carrinho', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'carrinho.html'));
});

// Middleware para validação e sanitização de dados avançada com proteção contra manipulação
function validateProductData(req, res, next) {
  try {
    const produto = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const errors = [];
    
    // Verificar usuário autenticado
    if (!req.user || req.user.uid !== ADMIN_UID) {
      console.warn(`Tentativa de manipulação de dados sem autenticação adequada - IP: ${clientIP}`);
      
      // Registrar no Firestore
      try {
        db.collection('security_logs').add({
          tipo: 'manipulacao_dados',
          detalhes: 'Tentativa de manipulação de dados sem autenticação adequada',
          ip: clientIP,
          userAgent: userAgent,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          endpoint: req.originalUrl,
          method: req.method,
          payload: JSON.stringify(req.body).substring(0, 500) // Limitar tamanho para evitar ataques DoS
        });
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      return res.status(403).json({
        error: 'Acesso negado. Autenticação inválida.',
        code: 'INVALID_AUTH'
      });
    }
    
    // Verificações de campos obrigatórios
    if (!produto) {
      return res.status(400).json({ 
        error: 'Dados do produto não fornecidos', 
        code: 'MISSING_DATA' 
      });
    }
    
    // Verificar tentativa de injeção ou XSS em campos de texto
    const potentialXssPattern = /<script|javascript:|on\w+\s*=|<iframe|<img.*onerror|alert\s*\(|eval\s*\(|Function\s*\(/i;
    
    // Verificação anti-XSS em campos de texto
    for (const [key, value] of Object.entries(produto)) {
      if (typeof value === 'string' && potentialXssPattern.test(value)) {
        console.warn(`Potencial ataque XSS detectado em ${key} - IP: ${clientIP}`);
        
        // Registrar tentativa de XSS
        try {
          db.collection('security_logs').add({
            tipo: 'xss_detectado',
            detalhes: `Potencial ataque XSS em campo ${key}`,
            campo: key,
            valor: value.substring(0, 200), // Limitar para evitar log de payloads grandes
            ip: clientIP,
            userAgent: userAgent,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (logError) {
          console.error('Erro ao registrar log de segurança:', logError);
        }
        
        return res.status(400).json({
          error: 'Conteúdo potencialmente malicioso detectado',
          code: 'POTENTIAL_XSS'
        });
      }
    }
    
    // Validação do nome (obrigatório)
    if (!produto.nome) {
      errors.push('Nome do produto é obrigatório');
    } else if (typeof produto.nome !== 'string') {
      errors.push('Nome do produto deve ser uma string');
    } else if (produto.nome.trim() === '') {
      errors.push('Nome do produto não pode estar vazio');
    } else if (produto.nome.length > 100) {
      errors.push('Nome do produto não pode exceder 100 caracteres');
    }
    
    // Validação do preço
    if (produto.preco !== undefined) {
      if (typeof produto.preco !== 'number') {
        errors.push('Preço deve ser um número');
      } else if (produto.preco < 0) {
        errors.push('Preço não pode ser negativo');
      } else if (produto.preco > 1000000) {
        errors.push('Preço excede o valor máximo permitido');
      }
    }
    
    // Validação do estoque
    if (produto.estoque !== undefined) {
      if (typeof produto.estoque !== 'number') {
        errors.push('Estoque deve ser um número');
      } else if (produto.estoque < 0) {
        errors.push('Estoque não pode ser negativo');
      } else if (!Number.isInteger(produto.estoque)) {
        errors.push('Estoque deve ser um número inteiro');
      } else if (produto.estoque > 100000) {
        errors.push('Estoque excede o valor máximo permitido');
      }
    }
    
    // Validação da descrição
    if (produto.descricao !== undefined && produto.descricao !== null) {
      if (typeof produto.descricao !== 'string') {
        errors.push('Descrição deve ser uma string');
      } else if (produto.descricao.length > 1000) {
        errors.push('Descrição não pode exceder 1000 caracteres');
      }
    }
    
    // Validação da categoria
    if (produto.categoria !== undefined && produto.categoria !== null) {
      if (typeof produto.categoria !== 'string') {
        errors.push('Categoria deve ser uma string');
      } else if (produto.categoria.length > 50) {
        errors.push('Categoria não pode exceder 50 caracteres');
      }
    }
    
    // Validação da imagem
    if (produto.imagem !== undefined && produto.imagem !== null) {
      if (typeof produto.imagem !== 'string') {
        errors.push('URL da imagem deve ser uma string');
      } else if (produto.imagem.length > 500) {
        errors.push('URL da imagem não pode exceder 500 caracteres');
      } else {
        // Verificação básica de URL
        try {
          const url = new URL(produto.imagem);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('URL da imagem deve começar com http:// ou https://');
          }
        } catch (e) {
          // URL inválida
          if (produto.imagem.trim() !== '') {
            errors.push('URL da imagem inválida');
          }
        }
      }
    }
    
    // Validação de tags
    if (produto.tags !== undefined) {
      if (!Array.isArray(produto.tags)) {
        errors.push('Tags devem ser um array');
      } else {
        // Verificar cada tag
        for (let i = 0; i < produto.tags.length; i++) {
          const tag = produto.tags[i];
          if (typeof tag !== 'string') {
            errors.push(`Tag na posição ${i} deve ser uma string`);
          } else if (tag.length > 30) {
            errors.push(`Tag na posição ${i} não pode exceder 30 caracteres`);
          }
        }
        
        // Verificar se há tags duplicadas
        const uniqueTags = new Set(produto.tags);
        if (uniqueTags.size !== produto.tags.length) {
          errors.push('Não são permitidas tags duplicadas');
        }
        
        // Verificar número máximo de tags
        if (produto.tags.length > 10) {
          errors.push('Máximo de 10 tags permitidas');
        }
      }
    }
    
    // Validação de campos booleanos
    if (produto.destaque !== undefined && typeof produto.destaque !== 'boolean') {
      errors.push('Campo destaque deve ser um valor booleano');
    }
    
    if (produto.novidade !== undefined && typeof produto.novidade !== 'boolean') {
      errors.push('Campo novidade deve ser um valor booleano');
    }
    
    // Se houver erros, retornar todos eles
    if (errors.length > 0) {
      console.warn(`Validação falhou - IP: ${clientIP}, Erros: ${errors.join(', ')}`);
      
      // Registrar tentativa com dados inválidos no Firestore
      try {
        db.collection('security_logs').add({
          tipo: 'validacao_falha',
          detalhes: errors.join(', '),
          ip: clientIP,
          userAgent: req.headers['user-agent'] || 'Unknown',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          dados_enviados: JSON.stringify(produto),
          endpoint: req.originalUrl,
          method: req.method,
          usuario: req.user ? (req.user.email || req.user.uid) : 'Não autenticado'
        }).catch(err => console.error('Erro ao registrar log de validação:', err));
      } catch (logError) {
        console.error('Erro ao registrar log de validação:', logError);
      }
      
      return res.status(400).json({ 
        error: 'Dados do produto inválidos', 
        detalhes: errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Sanitizar e validar os campos (dados validados)
    req.sanitizedData = {
      nome: (produto.nome || '').trim().substring(0, 100),
      descricao: produto.descricao ? produto.descricao.trim().substring(0, 1000) : '',
      categoria: produto.categoria ? produto.categoria.trim().substring(0, 50) : '',
      preco: typeof produto.preco === 'number' ? Math.max(0, Math.min(1000000, produto.preco)) : 0,
      estoque: typeof produto.estoque === 'number' ? Math.max(0, Math.min(100000, Math.floor(produto.estoque))) : 0,
      imagem: produto.imagem ? produto.imagem.trim().substring(0, 500) : '',
      destaque: !!produto.destaque,
      novidade: !!produto.novidade,
      tags: Array.isArray(produto.tags) 
        ? [...new Set(produto.tags.map(tag => tag.trim()).filter(tag => tag !== ''))]
            .slice(0, 10)
            .map(tag => tag.substring(0, 30))
        : []
    };
    
    // Log de dados validados com sucesso (nível debug)
    console.log(`Dados validados com sucesso - Endpoint: ${req.originalUrl}, Método: ${req.method}`);
    
    next();
  } catch (error) {
    console.error('Erro na validação de dados:', error);
    
    // Registrar erro no Firestore
    try {
      db.collection('security_logs').add({
        tipo: 'erro_validacao',
        detalhes: error.message,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.originalUrl,
        method: req.method
      }).catch(err => console.error('Erro ao registrar log de erro de validação:', err));
    } catch (logError) {
      console.error('Erro ao registrar log de erro:', logError);
    }
    
    res.status(400).json({ 
      error: 'Falha ao processar dados do produto', 
      message: error.message,
      code: 'PROCESSING_ERROR'
    });
  }
}

// Rotas API para produtos (todas protegidas por autenticação)
// Obter todos os produtos
app.get('/api/produtos', autenticarToken, async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos', detalhes: error.message });
  }
});

// Criar novo produto
app.post('/api/produtos', autenticarToken, validateProductData, async (req, res) => {
  try {
    const produto = req.sanitizedData;
    
    // Adicionar timestamps
    produto.createdAt = admin.firestore.FieldValue.serverTimestamp();
    produto.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Salvar no Firestore
    const docRef = await db.collection('produtos').add(produto);
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'criar',
      produto_id: docRef.id,
      nome_produto: produto.nome,
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify(produto),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({ 
      id: docRef.id, 
      ...produto,
      message: 'Produto criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto', detalhes: error.message });
  }
});

// Atualizar produto existente
app.put('/api/produtos/:id', autenticarToken, validateProductData, async (req, res) => {
  try {
    const { id } = req.params;
    const produto = req.sanitizedData;
    
    // Verificar se o produto existe
    const docRef = db.collection('produtos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Adicionar timestamp de atualização
    produto.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Atualizar no Firestore
    await docRef.update(produto);
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'editar',
      produto_id: id,
      nome_produto: produto.nome,
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify(produto),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      id, 
      ...produto,
      message: 'Produto atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto', detalhes: error.message });
  }
});

// Excluir produto
app.delete('/api/produtos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o produto existe
    const docRef = db.collection('produtos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Obter dados do produto antes de excluir (para o log)
    const produtoData = doc.data();
    
    // Excluir do Firestore
    await docRef.delete();
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'excluir',
      produto_id: id,
      nome_produto: produtoData.nome || 'Produto sem nome',
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify({ id, ...produtoData }),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      message: 'Produto excluído com sucesso',
      id
    });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto', detalhes: error.message });
  }
});

// Obter logs de atividade
app.get('/api/logs', autenticarToken, async (req, res) => {
  try {
    const snapshot = await db.collection('logs_atividade')
      .orderBy('data', 'desc')
      .limit(100)
      .get();
      
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data ? doc.data().data.toDate() : new Date()
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs', detalhes: error.message });
  }
});

// Middleware para tratar rotas inexistentes
app.use((req, res, next) => {
  res.status(404).send('Página não encontrada');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} (0.0.0.0)`);
});