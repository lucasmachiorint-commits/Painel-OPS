// ============================================================
// SUPABASE AUTH CONFIGURATION
// ============================================================
// Substitua pelas credenciais do seu projeto no Supabase Dashboard
const SUPABASE_URL = 'https://maguyzjhldcgpcvkvkqe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ3V5empobGRjZ3Bjdmt2a3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTU0MDMsImV4cCI6MjEwMDIzMTQwM30.Ow9xruE1qAFTX3mqELERxrY3CRBOdV_n4MoXXhtt3Y8';

let supabaseClient = null;
let realtimeChannel = null;
if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.warn('Erro ao inicializar Supabase Client:', err);
    }
}

// ============================================================
// RBAC - CONTROLE DE ACESSO BASEADO EM PERFIS
// ============================================================
let currentUser = {
    nome: 'Visitante',
    email: '',
    perfil: 'CONSULTA'  // 'ADMIN' | 'OPERADOR' | 'CONSULTA'
};

// Hierarquia de permissÃµes: CONSULTA < OPERADOR < ADMIN
function verificarPermissao(perfilMinimo) {
    const hierarquia = { 'CONSULTA': 0, 'OPERADOR': 1, 'ADMIN': 2 };
    return (hierarquia[currentUser.perfil] || 0) >= (hierarquia[perfilMinimo] || 0);
}

// Varre o DOM e oculta/exibe elementos conforme o perfil do usuÃ¡rio
function aplicarPerfilDeAcesso() {
    const perfil = currentUser.perfil;

    // Atualiza barra visual na sidebar
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    if (userNameEl) userNameEl.textContent = currentUser.nome;
    if (userRoleEl) {
        userRoleEl.textContent = perfil;
        userRoleEl.className = 'user-role-badge role-' + perfil.toLowerCase();
    }

    // Sincroniza o seletor de perfil
    const selectProfile = document.getElementById('select-user-profile');
    if (selectProfile) selectProfile.value = perfil;

    // Varre todos os elementos com data-permissao
    document.querySelectorAll('[data-permissao]').forEach(el => {
        const permitidos = el.getAttribute('data-permissao').split(',').map(s => s.trim());
        if (permitidos.includes(perfil)) {
            el.style.display = '';
            el.removeAttribute('data-rbac-hidden');
        } else {
            el.style.display = 'none';
            el.setAttribute('data-rbac-hidden', 'true');
        }
    });

    // Controla coluna Excluir na tabela de Cadastros (header + cells)
    const isAdmin = perfil === 'ADMIN';
    document.querySelectorAll('.col-excluir-admin').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });

    // Controla inputs editÃ¡veis para perfil CONSULTA
    const isConsulta = perfil === 'CONSULTA';
    document.querySelectorAll('.input-volume, .input-minutes, .input-qtd, .input-backlog-volume, .input-area-allocation').forEach(el => {
        el.disabled = isConsulta;
        el.style.opacity = isConsulta ? '0.5' : '1';
    });
    document.querySelectorAll('.select-review-status').forEach(el => {
        el.disabled = isConsulta;
        el.style.opacity = isConsulta ? '0.5' : '1';
    });
    // Controla inputs editÃ¡veis na tabela de Cadastros
    document.querySelectorAll('.input-activity-name-cell, .select-activity-team-cell, .select-activity-resp-cell').forEach(el => {
        el.disabled = isConsulta;
        el.style.opacity = isConsulta ? '0.5' : '1';
    });
}

// APPLICATION STATE MANAGEMENT
let state = {
    params: {
        horasDia: 8.0,
        absenteismo: 20,
        diasUteis: 21,
        teamSize: 5.0
    },
    processes: [],
    customAreas: [],
    areaAllocations: {}
};

// CHART INSTANCES
let pieChartInstance = null;
let barChartInstance = null;

// DEFAULT EXAMPLE DATA WITH AREAS
const EXAMPLE_PROCESSES = [
    { id: 'ex-1', name: 'Cancelamento DY - SolicitaÃ§Ã£o CB (Fila Projeto)', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-2', name: 'ProrrogaÃ§Ã£o', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-3', name: 'Baixa de Parcela (RobÃ´ Baixas) - Demandas BKO + Baixa em lote + Baixa manual', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-4', name: 'Improcedente DY', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-5', name: 'DevoluÃ§Ã£o de pagamento em duplicidade', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-6', name: 'Reembolso (RobÃ´ Reembolsos) Montagem Arquivo + Upload Zord + Monitoria/Retorno', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-7', name: 'Cancelamento CAPTA + Cancelamento Jira', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-8', name: 'Cancelamento SAP + Cancelamento Jira', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-9', name: 'DÃ©bitos Pag Emana Pay', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-10', name: 'Cancelamento DY - SolicitaÃ§Ã£o CB (Fila N3) + Cancelamento Jira', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-11', name: 'Pagamento nÃ£o processado', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-12', name: 'Parcela invertida', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-13', name: 'Cancelamento Parcial/AmortizaÃ§Ã£o', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-14', name: 'AmortizaÃ§Ã£o Nota de credito', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-15', name: 'Recompra (AmortizaÃ§Ã£o e Recompra Proativa)', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' },
    { id: 'ex-16', name: 'DÃºvidas - Pagamento, CobranÃ§a e Espelhamento', area: 'Backoffice', volume: '', minutos: 0, qtdExecucao: '', backlogVolume: '', allocatedResource: '' }
];

function getSupabase() {
    if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (err) {
            console.error('Erro ao inicializar Supabase Client:', err);
        }
    }
    return supabaseClient;
}

// AUTHENTICATION LOGIC (SUPABASE)
async function handleLogin() {
    hideAuthError();
    hideAuthInfo();
    
    const emailEl = document.getElementById('auth-email');
    const passEl = document.getElementById('auth-password');
    const btnLogin = document.getElementById('btn-auth-login');
    
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';
    
    if (!email || !password) {
        showAuthError("Por favor, preencha o e-mail e a senha.");
        return;
    }
    
    const client = getSupabase();
    if (!client) {
        showAuthError("NÃ£o foi possÃ­vel conectar ao Supabase SDK. Verifique sua conexÃ£o ou se o SDK foi carregado.");
        return;
    }

    const origText = btnLogin ? btnLogin.textContent : '';
    if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Aguarde...';
    }

    try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        
        if (error) {
            showAuthError(error.message || "Erro ao efetuar login.");
        } else if (data && data.session && data.session.user) {
            setupUserSession(data.session.user);
        } else {
            showAuthError("UsuÃ¡rio ou senha incorretos.");
        }
    } catch (err) {
        showAuthError(err.message || "Ocorreu um erro inesperado ao tentar fazer login.");
    } finally {
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = origText;
        }
    }
}

async function handleSignup() {
    hideAuthError();
    hideAuthInfo();
    
    const emailEl = document.getElementById('auth-email');
    const passEl = document.getElementById('auth-password');
    const btnSignup = document.getElementById('btn-auth-signup');
    
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';
    
    if (!email || !password) {
        showAuthError("Por favor, preencha o e-mail e a senha.");
        return;
    }
    
    if (password.length < 6) {
        showAuthError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    
    const client = getSupabase();
    if (!client) {
        showAuthError("NÃ£o foi possÃ­vel conectar ao Supabase. Verifique sua conexÃ£o com a internet.");
        return;
    }

    const origText = btnSignup ? btnSignup.textContent : '';
    if (btnSignup) {
        btnSignup.disabled = true;
        btnSignup.textContent = 'Criando conta...';
    }

    try {
        // Todo usuÃ¡rio recÃ©m cadastrado recebe perfil 'CONSULTA' por padrÃ£o nos metadados
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    perfil: 'CONSULTA',
                    nome: email.split('@')[0]
                }
            }
        });

        if (error) {
            showAuthError(error.message || "Erro ao cadastrar usuÃ¡rio.");
        } else if (data) {
            if (data.session && data.session.user) {
                showAuthInfo("Conta criada e autenticada com sucesso!");
                setupUserSession(data.session.user);
            } else if (data.user) {
                showAuthInfo("Conta criada com sucesso! Se a confirmaÃ§Ã£o de e-mail estiver ativa no seu projeto Supabase, verifique sua caixa de entrada para ativar a conta.");
            } else {
                showAuthInfo("Cadastro realizado com sucesso.");
            }
        }
    } catch (err) {
        showAuthError(err.message || "Ocorreu um erro inesperado ao cadastrar.");
    } finally {
        if (btnSignup) {
            btnSignup.disabled = false;
            btnSignup.textContent = origText;
        }
    }
}

async function handleLogout() {
    unsubscribeRealtime();
    const client = getSupabase();
    if (client) {
        try {
            await client.auth.signOut();
        } catch (e) {
            console.error('Erro no logout:', e);
        }
    }
    showAuthOverlay();
}

function showAuthError(msg) {
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }
}

function hideAuthError() {
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

function showAuthInfo(msg) {
    const infoMsg = document.getElementById('auth-info-msg');
    if (infoMsg) {
        infoMsg.textContent = msg;
        infoMsg.style.display = 'block';
    }
}

function hideAuthInfo() {
    const infoMsg = document.getElementById('auth-info-msg');
    if (infoMsg) {
        infoMsg.style.display = 'none';
    }
}

function showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
}

async function setupUserSession(user) {
    if (!user) {
        showAuthOverlay();
        return;
    }
    
    // Store user ID globally for "Você" badge in access control table
    window._authUserId = user.id;
    
    const userMetadata = user.user_metadata || {};
    currentUser.email = user.email || '';
    currentUser.nome  = userMetadata.nome || user.email.split('@')[0];
    
    // Try to fetch profile from the `profiles` table first; fallback to user_metadata
    const client = getSupabase();
    if (client) {
        try {
            const { data: profile } = await client
                .from('profiles')
                .select('perfil, nome')
                .eq('id', user.id)
                .single();
            if (profile) {
                currentUser.perfil = profile.perfil || 'CONSULTA';
                currentUser.nome   = profile.nome   || currentUser.nome;
            } else {
                currentUser.perfil = userMetadata.perfil || 'CONSULTA';
            }
        } catch (_) {
            currentUser.perfil = userMetadata.perfil || 'CONSULTA';
        }
    } else {
        currentUser.perfil = userMetadata.perfil || 'CONSULTA';
    }
    
    hideAuthOverlay();

    // Carregar estado do Supabase (prioridade sobre localStorage)
    const loaded = await loadStateFromSupabase();
    if (!loaded) {
        // Se não houver dados no Supabase ainda, faz o primeiro envio do estado local
        await saveStateToSupabase();
    }

    // Iniciar inscrição no Supabase Realtime
    subscribeRealtime();

    refreshAllViews();
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    loadState();
    setupEventListeners();
    
    // Bind Auth buttons
    const btnLogin = document.getElementById('btn-auth-login');
    const btnSignup = document.getElementById('btn-auth-signup');
    const btnLogout = document.getElementById('btn-logout');

    if (btnLogin) btnLogin.addEventListener('click', handleLogin);
    if (btnSignup) btnSignup.addEventListener('click', handleSignup);
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Check existing Supabase session
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            setupUserSession(session.user);
        } else {
            showAuthOverlay();
        }

        // Listen to auth changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setupUserSession(session.user);
            } else if (event === 'SIGNED_OUT') {
                showAuthOverlay();
            }
        });
    } else {
        // Fallback for demonstration if Supabase SDK is not loaded or missing credentials
        showAuthOverlay();
        showAuthError("Aviso: Configure o SUPABASE_URL e SUPABASE_ANON_KEY no app.js para utilizar a autenticaÃ§Ã£o.");
    }
    
    renderAreaFilterOptions();
    renderResponsavelFilterOptions();
    renderCadastrosView();
    renderTable();
    renderBalancingTable();
    renderReviewTable();
});

// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
        pointer-events: auto;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        color: #fff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        background: ${type === 'error' ? 'rgba(239, 68, 68, 0.95)' : type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(59, 130, 246, 0.95)'};
        backdrop-filter: blur(8px);
    `;

    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'warning' ? 'fa-triangle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="font-size: 1rem;"></i> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// REALTIME STATUS UI INDICATOR
function updateRealtimeStatusUI(status, customMessage) {
    const badge = document.getElementById('realtime-status-badge');
    if (!badge) return;

    const dot = badge.querySelector('.status-dot');
    const text = badge.querySelector('.status-text');

    if (status === 'SUBSCRIBED') {
        if (dot) dot.style.background = '#10b981'; // Green
        if (text) text.textContent = 'Sincronizado';
        badge.title = 'Realtime ativo: Qualquer alteração será sincronizada com todos os usuários.';
    } else if (status === 'CONNECTING') {
        if (dot) dot.style.background = '#eab308'; // Yellow
        if (text) text.textContent = 'Conectando...';
        badge.title = 'Conectando ao canal de tempo real...';
    } else if (status === 'ERROR' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        if (dot) dot.style.background = '#ef4444'; // Red
        if (text) text.textContent = customMessage || 'Offline (Local)';
        badge.title = 'Sem sincronização remota em tempo real. Verifique se a tabela board_state existe no Supabase.';
    }
}

// REFRESH ALL UI VIEWS
function refreshAllViews() {
    renderCadastrosView();
    renderTable();
    renderBalancingTable();
    renderReviewTable();
    renderAreaFilterOptions();
    renderResponsavelFilterOptions();
    aplicarPerfilDeAcesso();
}

// REALTIME SUBSCRIPTION HELPERS
function subscribeRealtime() {
    const client = getSupabase();
    if (!client) return;

    if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    updateRealtimeStatusUI('CONNECTING');

    realtimeChannel = client
        .channel('board-changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'board_state'
        }, (payload) => {
            console.log('[Realtime] Evento recebido via WebSocket:', payload.eventType, payload);
            
            const payloadData = payload.new || payload.record;
            if (payloadData && payloadData.data) {
                const myUserId = window._authUserId;
                if (payloadData.updated_by && payloadData.updated_by === myUserId) {
                    return; // Ignore local updates sent by current user
                }
                
                state = payloadData.data;
                applyStateMigrations();
                localStorage.setItem('capacity_fte_hub_state', JSON.stringify(state));
                refreshAllViews();
                showToast('⚡ O painel foi atualizado em tempo real por outro usuário!', 'info', 4000);
            }
        })
        .subscribe((status, err) => {
            console.log('[Realtime] Status da inscrição:', status, err || '');
            if (status === 'SUBSCRIBED') {
                updateRealtimeStatusUI('SUBSCRIBED');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                updateRealtimeStatusUI('ERROR', 'Erro Realtime');
                console.warn('[Realtime Error] Certifique-se de que a publicação Realtime está ativa no Supabase (ALTER PUBLICATION supabase_realtime ADD TABLE board_state).');
            } else if (status === 'CLOSED') {
                updateRealtimeStatusUI('ERROR', 'Desconectado');
            }
        });
}

function unsubscribeRealtime() {
    const client = getSupabase();
    if (realtimeChannel && client) {
        client.removeChannel(realtimeChannel);
        realtimeChannel = null;
        updateRealtimeStatusUI('CLOSED');
        console.log('[Realtime] Canal desconectado.');
    }
}

// SUPABASE BOARD STATE PERSISTENCE
async function saveStateToSupabase() {
    const client = getSupabase();
    if (!client) return;

    try {
        const { data: { user } } = await client.auth.getUser();
        const { error } = await client
            .from('board_state')
            .upsert({
                id: 'default',
                data: state,
                updated_by: user ? user.id : null,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('[Supabase Save Error]', error);
            if (error.code === '42P01' || error.message?.includes('board_state')) {
                showToast('Erro Supabase: Tabela "board_state" não encontrada. Execute o SQL de configuração no Supabase.', 'error', 10000);
            } else if (error.code === '42501' || error.message?.includes('row-level security')) {
                showToast('Erro de permissão RLS no Supabase. Habilite políticas de SELECT/INSERT/UPDATE na tabela board_state.', 'error', 10000);
            } else {
                showToast(`Erro ao salvar no Supabase: ${error.message}`, 'error', 5000);
            }
            updateRealtimeStatusUI('ERROR', 'Erro ao Salvar');
        } else {
            updateRealtimeStatusUI('SUBSCRIBED');
        }
    } catch (err) {
        console.error('[Supabase Save Exception]', err);
        showToast('Falha na conexão ao salvar no Supabase.', 'warning');
        updateRealtimeStatusUI('ERROR', 'Erro Conexão');
    }
}

async function forceResetGlobalState() {
    if (!verificarPermissao('ADMIN')) {
        alert('Acesso negado: Perfil ADMIN necessário para publicar a base global.');
        return;
    }

    if (!confirm('Deseja realmente definir e publicar a sua visão atual como a base oficial para TODOS os usuários? Isso sincronizará a tela de todos imediatamente.')) {
        return;
    }

    const client = getSupabase();
    if (!client) return;

    try {
        const { data: { user } } = await client.auth.getUser();
        const { error } = await client
            .from('board_state')
            .upsert({
                id: 'default',
                data: state,
                updated_by: user ? user.id : null,
                updated_at: new Date().toISOString()
            });

        if (error) {
            showToast(`Erro ao publicar base no Supabase: ${error.message}`, 'error', 8000);
        } else {
            showToast('✅ Sua visão atual foi publicada com sucesso como a base global para todos!', 'success', 6000);
            updateRealtimeStatusUI('SUBSCRIBED');
        }
    } catch (err) {
        console.error('[Supabase Force Reset Error]', err);
        showToast('Erro de conexão ao publicar a base.', 'error');
    }
}

async function loadStateFromSupabase() {
    const client = getSupabase();
    if (!client) return false;

    try {
        const { data, error } = await client
            .from('board_state')
            .select('data, updated_at')
            .eq('id', 'default')
            .maybeSingle();

        if (error) {
            console.error('[Supabase Load Error]', error);
            if (error.code === '42P01' || error.message?.includes('board_state')) {
                showToast('Aviso: Tabela "board_state" não foi criada no Supabase ainda.', 'warning', 8000);
            } else {
                showToast(`Aviso ao carregar do Supabase: ${error.message}`, 'warning', 5000);
            }
            return false;
        }

        if (!data || !data.data) {
            console.log('[Supabase Load] Nenhum registro existente na tabela board_state.');
            return false;
        }

        state = data.data;
        applyStateMigrations();
        localStorage.setItem('capacity_fte_hub_state', JSON.stringify(state));
        console.log('[Supabase Load] Estado compartilhado carregado com sucesso!');
        return true;
    } catch (err) {
        console.error('[Supabase Load Exception]', err);
        return false;
    }
}

// STATE MIGRATIONS HELPER
function applyStateMigrations() {
    if (!state) return;
    if (!state.customAreas) state.customAreas = [];
    if (!state.areaAllocations) state.areaAllocations = {};
    if (!state.processes) state.processes = [];

    state.processes.forEach(p => {
        const match = EXAMPLE_PROCESSES.find(ep => ep.name === p.name);
        if (match) p.area = 'Backoffice';
        if (p.backlogVolume === undefined) p.backlogVolume = '';
        if (p.allocatedResource === undefined) p.allocatedResource = '';
        if (p.reviewStatus === undefined) p.reviewStatus = 'Manter';
        if (p.responsavel === undefined) p.responsavel = '';
    });
    if (state.history === undefined) state.history = [];
    if (state.teams === undefined) {
        if (state.customAreas && state.customAreas.length > 0) {
            state.teams = ['Backoffice', 'Governança', 'Seguros/N2', 'Eficiência Operacional', ...state.customAreas];
        } else {
            state.teams = ['Backoffice', 'Governança', 'Seguros/N2', 'Eficiência Operacional'];
        }
    }
    if (!state.teamHierarchy) state.teamHierarchy = {};
    
    const defaultRelations = {
        'Backoffice': { gerencia: 'Conciliação', diretoria: 'Operações' },
        'Governança': { gerencia: 'Suporte Operacional', diretoria: 'Operações' },
        'Seguros/N2': { gerencia: 'Atendimento', diretoria: 'Operações' },
        'Eficiência Operacional': { gerencia: 'Suporte Operacional', diretoria: 'Operações' }
    };
    
    state.teams.forEach(team => {
        if (!state.teamHierarchy[team]) {
            state.teamHierarchy[team] = defaultRelations[team] || { gerencia: 'Suporte Operacional', diretoria: 'Operações' };
        }
    });

    if (!state.responsaveis) {
        const uniqueResps = [...new Set(state.processes.map(p => p.responsavel || '').filter(r => r.trim() !== ''))].sort();
        state.responsaveis = uniqueResps.map(r => {
            const procWithResp = state.processes.find(p => p.responsavel === r);
            const inheritedArea = procWithResp ? procWithResp.area : '';
            return { name: r, area: inheritedArea, horasDia: null, absenteismo: null, diasUteis: null };
        });
    } else if (Array.isArray(state.responsaveis) && state.responsaveis.length > 0 && typeof state.responsaveis[0] === 'string') {
        state.responsaveis = state.responsaveis.map(r => {
            const procWithResp = state.processes.find(p => p.responsavel === r);
            const inheritedArea = procWithResp ? procWithResp.area : '';
            return { name: r, area: inheritedArea, horasDia: null, absenteismo: null, diasUteis: null };
        });
    } else if (Array.isArray(state.responsaveis)) {
        state.responsaveis.forEach(r => {
            if (r && typeof r === 'object' && r.area === undefined) {
                const procWithResp = state.processes.find(p => p.responsavel === r.name);
                r.area = procWithResp ? procWithResp.area : '';
            }
        });
    } else {
        state.responsaveis = [];
    }
}

// LOAD STATE FROM LOCALSTORAGE WITH AREA & BACKLOG MIGRATION
function loadState() {
    const saved = localStorage.getItem('capacity_fte_hub_state');
    let useDefaults = false;
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed || typeof parsed !== 'object' || !parsed.processes || !Array.isArray(parsed.processes) || !parsed.params) {
                useDefaults = true;
            } else {
                state = parsed;
                applyStateMigrations();
                saveState();
            }
        } catch (e) {
            console.error("Erro ao carregar dados do LocalStorage. Utilizando padrões.", e);
            useDefaults = true;
        }
    } else {
        useDefaults = true;
    }

    if (useDefaults) {
        state.processes = JSON.parse(JSON.stringify(EXAMPLE_PROCESSES));
        state.customAreas = [];
        state.areaAllocations = {};
        state.teams = ['Backoffice', 'Governança', 'Seguros/N2', 'Eficiência Operacional'];
        const uniqueResps = [...new Set(state.processes.map(p => p.responsavel || '').filter(r => r.trim() !== ''))].sort();
        state.responsaveis = uniqueResps.map(r => {
            const procWithResp = state.processes.find(p => p.responsavel === r);
            const inheritedArea = procWithResp ? procWithResp.area : '';
            return { name: r, area: inheritedArea, horasDia: null, absenteismo: null, diasUteis: null };
        });
        state.history = [];
        state.params = {
            horasDia: 8.0,
            absenteismo: 20,
            diasUteis: 21,
            teamSize: 5.0
        };
        saveState();
    }

    // Set UI control values based on state
    const elInputHoras = document.getElementById('input-horas-dia');
    if (elInputHoras) elInputHoras.value = state.params.horasDia;
    const elInputAbs = document.getElementById('input-absenteismo');
    if (elInputAbs) elInputAbs.value = state.params.absenteismo;
    const elInputDias = document.getElementById('input-dias-uteis');
    if (elInputDias) elInputDias.value = state.params.diasUteis;

    // Load saved theme
    const theme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = theme;
}

// SAVE STATE TO LOCALSTORAGE & SUPABASE WITH DEBOUNCE
let _saveDebounceTimer = null;

function saveState() {
    localStorage.setItem('capacity_fte_hub_state', JSON.stringify(state));
    
    // Debounce to prevent flooding Supabase with calls on every keystroke
    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => {
        saveStateToSupabase();
    }, 1000);
}

// GET RESPONSIBLE SPECIFIC CAPACITY PARAMETERS WITH GLOBAL FALLBACK
function getResponsibleParams(responsavelName) {
    const globalParams = {
        horasDia: state.params.horasDia,
        absenteismo: state.params.absenteismo,
        diasUteis: state.params.diasUteis
    };
    
    if (!responsavelName) {
        return globalParams;
    }
    
    // Find responsible object
    const respObj = (state.responsaveis || []).find(r => typeof r === 'object' && r && r.name === responsavelName);
    if (!respObj) {
        return globalParams;
    }
    
    const horasDia = (respObj.horasDia !== null && respObj.horasDia !== undefined && respObj.horasDia !== '') ? parseFloat(respObj.horasDia) : globalParams.horasDia;
    const absenteismo = (respObj.absenteismo !== null && respObj.absenteismo !== undefined && respObj.absenteismo !== '') ? parseFloat(respObj.absenteismo) : globalParams.absenteismo;
    const diasUteis = (respObj.diasUteis !== null && respObj.diasUteis !== undefined && respObj.diasUteis !== '') ? parseFloat(respObj.diasUteis) : globalParams.diasUteis;
    
    return { horasDia, absenteismo, diasUteis };
}

// GLOBAL MODAL FUNCTIONS FOR NOVA EQUIPE
// Defined globally so they work with onclick= attributes in HTML

function openNewTeamModal() {
    const modal = document.getElementById('modal-new-team');
    const nameInput = document.getElementById('modal-input-new-team');
    const errorDiv = document.getElementById('modal-new-team-error');
    if (nameInput) nameInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
    if (modal) modal.style.display = 'flex';
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
}

function closeNewTeamModal() {
    const modal = document.getElementById('modal-new-team');
    if (modal) modal.style.display = 'none';
}

function saveNewTeamFromModal() {
    if (!verificarPermissao('OPERADOR')) { alert('Acesso negado: Perfil OPERADOR necessÃ¡rio.'); return; }
    const nameInput = document.getElementById('modal-input-new-team');
    const gerenciaSelect = document.getElementById('modal-select-team-gerencia');
    const diretoriaSelect = document.getElementById('modal-select-team-diretoria');
    const errorDiv = document.getElementById('modal-new-team-error');
    const modal = document.getElementById('modal-new-team');

    const teamName = nameInput ? nameInput.value.trim() : '';
    if (!teamName) {
        if (errorDiv) { errorDiv.textContent = 'Por favor, informe o nome da equipe.'; errorDiv.style.display = 'block'; }
        if (nameInput) nameInput.focus();
        return;
    }
    if ((state.teams || []).map(t => t.toLowerCase()).includes(teamName.toLowerCase())) {
        if (errorDiv) { errorDiv.textContent = 'Esta equipe jÃ¡ estÃ¡ cadastrada.'; errorDiv.style.display = 'block'; }
        if (nameInput) nameInput.focus();
        return;
    }

    const gerencia = gerenciaSelect ? gerenciaSelect.value : 'Suporte Operacional';
    const diretoria = diretoriaSelect ? diretoriaSelect.value : 'OperaÃ§Ãµes';

    state.teams.push(teamName);
    if (!state.teamHierarchy) state.teamHierarchy = {};
    state.teamHierarchy[teamName] = { gerencia, diretoria };

    saveState();
    if (modal) modal.style.display = 'none';
    renderCadastrosView();
    renderAreaFilterOptions();
    renderTable();
    renderBalancingTable();
    renderReviewTable();
}

// SETUP REGISTERED EVENT LISTENERS
function setupEventListeners() {
    // Menu Tab Switcher
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const menuItem = e.currentTarget;
            const view = menuItem.dataset.view;
            
            // Update active menu tab
            document.querySelectorAll('.sidebar-menu .menu-item').forEach(mi => mi.classList.remove('active'));
            menuItem.classList.add('active');
            
            // Show/hide views
            document.querySelectorAll('.tab-view').forEach(tv => tv.style.display = 'none');
            document.getElementById(`view-${view}`).style.display = 'block';
            
            // Update header title & refresh tables
            const headerTitle = document.getElementById('app-view-title');
            if (view === 'cadastros') {
                headerTitle.textContent = 'Cadastro';
                renderCadastrosView();
            } else if (view === 'dashboard') {
                headerTitle.textContent = 'Processos e atividades';
                renderTable();
            } else if (view === 'balancing') {
                headerTitle.textContent = 'Balanceamento de Backlog';
                renderBalancingTable();
            } else if (view === 'review') {
                headerTitle.textContent = 'RevisÃ£o de Atividades';
                renderReviewTable();
            } else if (view === 'history') {
                headerTitle.textContent = 'HistÃ³rico de Volumes';
                initHistoryView();
            } else if (view === 'access-control') {
                headerTitle.textContent = 'Controle de Acesso';
                renderAccessControlView();
            }
        });
    });

    // Initialize Capacity Modal Listeners
    setupModalParametersListeners();

    // Global parameters button trigger
    const btnGlobalParams = document.getElementById('btn-global-params');
    if (btnGlobalParams) {
        btnGlobalParams.addEventListener('click', () => {
            openCapacityModal();
        });
    }

    // Select All Checkbox in Cadastros view
    const selectAllCheckbox = document.getElementById('cadastros-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.cadastros-row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateBulkDeleteState();
        });
    }

    // Bulk Delete Action in Cadastros view
    const btnBulkDeleteSelected = document.getElementById('btn-cadastros-delete-selected');
    if (btnBulkDeleteSelected) {
        btnBulkDeleteSelected.addEventListener('click', () => {
            if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
            const checkedBoxes = document.querySelectorAll('.cadastros-row-checkbox:checked');
            const idsToDelete = [...checkedBoxes].map(cb => cb.dataset.id);
            if (idsToDelete.length === 0) return;
            
            if (confirm(`Deseja realmente excluir as ${idsToDelete.length} atividades selecionadas?`)) {
                state.processes = state.processes.filter(p => !idsToDelete.includes(p.id));
                saveState();
                
                // Reset select all checkbox
                const selectAllCb = document.getElementById('cadastros-select-all');
                if (selectAllCb) selectAllCb.checked = false;
                if (btnBulkDeleteSelected) btnBulkDeleteSelected.style.display = 'none';
                
                renderCadastrosView();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
            }
        });
    }

    // Theme Toggle
    const themeToggleEl = document.getElementById('theme-toggle');
    if (themeToggleEl) {
        themeToggleEl.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-theme');
            if (isDark) {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light-theme');
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark-theme');
            }
            updateChartsTheme();
        });
    }

    // Area & Owner filter triggers
    const filterAreaEl = document.getElementById('filter-area');
    if (filterAreaEl) {
        filterAreaEl.addEventListener('change', () => {
            renderTable();
        });
    }

    const filterRespEl = document.getElementById('filter-responsavel');
    if (filterRespEl) {
        filterRespEl.addEventListener('change', () => {
            renderTable();
        });
    }

    const filterAreaBalEl = document.getElementById('filter-area-balancing');
    if (filterAreaBalEl) {
        filterAreaBalEl.addEventListener('change', () => {
            renderBalancingTable();
        });
    }

    const filterRespBalEl = document.getElementById('filter-responsavel-balancing');
    if (filterRespBalEl) {
        filterRespBalEl.addEventListener('change', () => {
            renderBalancingTable();
        });
    }

    const filterAreaRevEl = document.getElementById('filter-area-review');
    if (filterAreaRevEl) {
        filterAreaRevEl.addEventListener('change', () => {
            renderReviewTable();
        });
    }

    const filterRespRevEl = document.getElementById('filter-responsavel-review');
    if (filterRespRevEl) {
        filterRespRevEl.addEventListener('change', () => {
            renderReviewTable();
        });
    }

    // Bulk select checkbox header
    const checkAllEl = document.getElementById('check-all');
    if (checkAllEl) {
        checkAllEl.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateDeleteSelectedButton();
        });
    }

    // Cadastros - Nova Equipe modal (open/close/save handled by global functions below)

    // Cadastros - Add Responsible button
    const handleAddResponsible = () => {
        if (!verificarPermissao('OPERADOR')) { alert('Acesso negado: Perfil OPERADOR necessÃ¡rio.'); return; }
        const respInput = document.getElementById('input-new-responsible');
        if (!respInput) return;
        const respName = respInput.value.trim();
        if (!respName) {
            alert("Por favor, digite o nome do responsÃ¡vel.");
            return;
        }
        
        const teamSelect = document.getElementById('select-new-responsible-team');
        let selectedTeam = teamSelect ? teamSelect.value : '';
        if (!selectedTeam && Array.isArray(state.teams) && state.teams.length > 0) {
            selectedTeam = state.teams[0];
        }
        
        if (!Array.isArray(state.responsaveis)) {
            state.responsaveis = [];
        }
        
        const currentNames = state.responsaveis.map(r => (r && r.name ? r.name : String(r)).toLowerCase());
        if (currentNames.includes(respName.toLowerCase())) {
            alert("Este responsÃ¡vel jÃ¡ estÃ¡ cadastrado.");
            return;
        }
        
        state.responsaveis.push({
            name: respName,
            area: selectedTeam || '',
            horasDia: null,
            absenteismo: null,
            diasUteis: null
        });
        state.responsaveis.sort((a, b) => a.name.localeCompare(b.name));
        
        saveState();
        respInput.value = '';
        renderCadastrosView();
        renderResponsavelFilterOptions();
        renderTable();
        renderBalancingTable();
        renderReviewTable();
    };

    const btnAddResp = document.getElementById('btn-add-responsible');
    if (btnAddResp) {
        btnAddResp.addEventListener('click', handleAddResponsible);
    }

    const inputResp = document.getElementById('input-new-responsible');
    if (inputResp) {
        inputResp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddResponsible();
            }
        });
    }

    // Cadastros - Add Activity row
    document.getElementById('btn-cadastros-add-row').addEventListener('click', () => {
        addNewProcess();
    });

    // Cadastros - Import Excel buttons
    document.getElementById('btn-cadastros-import-excel').addEventListener('click', () => {
        document.getElementById('cadastros-import-excel-file').click();
    });

    document.getElementById('cadastros-import-excel-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importExcelFile(file);
            e.target.value = ''; // Reset input
        }
    });

    // Backlog Action Buttons
    document.getElementById('btn-import-active-volumes').addEventListener('click', () => {
        state.processes.forEach(proc => {
            const hasVolume = proc.volume !== null && proc.volume !== '';
            proc.backlogVolume = hasVolume ? proc.volume : (proc.qtdExecucao !== null && proc.qtdExecucao !== '' ? proc.qtdExecucao : '');
        });
        saveState();
        renderBalancingTable();
    });

    document.getElementById('btn-clear-backlog-volumes').addEventListener('click', () => {
        if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
        state.processes.forEach(proc => {
            proc.backlogVolume = '';
        });
        saveState();
        renderBalancingTable();
    });

    const btnLoadExample = document.getElementById('btn-load-example');
    if (btnLoadExample) {
        btnLoadExample.addEventListener('click', () => {
            loadExampleData();
        });
    }

    document.getElementById('btn-empty-load-example').addEventListener('click', () => {
        loadExampleData();
    });

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todos os dados do simulador?')) {
                resetSimulator();
            }
        });
    }

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        exportToCSV();
    });

    // History View Event Listeners
    document.getElementById('btn-save-history').addEventListener('click', () => {
        saveHistorySnapshot();
    });

    document.getElementById('filter-history-type').addEventListener('change', () => {
        populateHistoryItemOptions();
        renderHistoryChart();
    });

    document.getElementById('filter-history-item').addEventListener('change', () => {
        renderHistoryChart();
    });

    document.getElementById('btn-print').addEventListener('click', () => {
        window.print();
    });
}

// BUILD PROCESS TABLE DOM (DASHBOARD TAB)
function renderTable() {
    const tableBody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state');
    const filterValue = document.getElementById('filter-area').value;
    const respFilter = document.getElementById('filter-responsavel').value;
    
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const filteredProcesses = state.processes.filter(p => {
        const areaMatch = filterValue === 'all' || p.area === filterValue;
        const respMatch = respFilter === 'all' || p.responsavel === respFilter;
        return areaMatch && respMatch;
    });

    if (filteredProcesses.length === 0) {
        if (state.processes.length === 0) {
            emptyState.style.display = 'flex';
            document.getElementById('fte-table').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            document.getElementById('fte-table').style.display = 'table';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma atividade cadastrada nesta busca/filtro.</td>`;
            tableBody.appendChild(tr);
        }
        updateCalculations();
        return;
    } else {
        emptyState.style.display = 'none';
        document.getElementById('fte-table').style.display = 'table';
    }

    filteredProcesses.forEach((proc) => {
        const tr = document.createElement('tr');
        tr.dataset.id = proc.id;
        if (proc.reviewStatus === 'Parar') {
            tr.className = 'row-review-stopped';
        }
        
        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
                    <span style="font-weight: 500; color: var(--text-primary);">${escapeHtml(proc.name)}</span>
                    ${proc.reviewStatus && proc.reviewStatus !== 'Manter' ? `<span class="badge-review badge-review-${proc.reviewStatus.toLowerCase()}">${proc.reviewStatus}</span>` : ''}
                </div>
            </td>
            <td>
                <span class="badge-area" style="font-size: 0.85rem; padding: 0.25rem 0.5rem; border-radius: 4px; background: rgba(235, 92, 39, 0.08); color: var(--color-primary); border: 1px solid rgba(235, 92, 39, 0.15);">${escapeHtml(proc.area || 'Sem Equipe')}</span>
            </td>
            <td>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(proc.responsavel || 'Sem ResponsÃ¡vel')}</span>
            </td>
            <td>
                <input type="number" class="input-volume" value="${proc.volume}" placeholder="---" min="0">
            </td>
            <td>
                <input type="number" class="input-minutes" value="${proc.minutos}" placeholder="0" min="0">
            </td>
            <td>
                <input type="number" class="input-qtd" value="${proc.qtdExecucao}" placeholder="---" min="0">
            </td>
            <td class="cell-hours">0.0h</td>
            <td class="cell-highlight-pct neon-text-secondary">0.00%</td>
        `;

        const volumeInput = tr.querySelector('.input-volume');
        const minutesInput = tr.querySelector('.input-minutes');
        const qtdInput = tr.querySelector('.input-qtd');

        volumeInput.addEventListener('input', (e) => {
            const val = e.target.value;
            proc.volume = val !== '' ? parseFloat(val) : '';
            if (val !== '') {
                proc.qtdExecucao = '';
                qtdInput.value = '';
            }
            updateCalculations();
        });

        minutesInput.addEventListener('input', (e) => {
            const val = e.target.value;
            proc.minutos = val !== '' ? parseFloat(val) : '';
            updateCalculations();
        });

        qtdInput.addEventListener('input', (e) => {
            const val = e.target.value;
            proc.qtdExecucao = val !== '' ? parseFloat(val) : '';
            if (val !== '') {
                proc.volume = '';
                volumeInput.value = '';
            }
            updateCalculations();
        });

        tableBody.appendChild(tr);
    });

    updateCalculations();
}

// RENDER PROCESS BACKLOGS (BALANCEAMENTO TAB)
function renderBalancingTable() {
    const balancingBody = document.getElementById('balancing-table-body');
    const emptyState = document.getElementById('balancing-empty-state');
    const filterValue = document.getElementById('filter-area-balancing').value;
    
    balancingBody.innerHTML = '';
    
    const respFilter = document.getElementById('filter-responsavel-balancing').value;
    const filteredProcesses = state.processes.filter(p => {
        const areaMatch = filterValue === 'all' || p.area === filterValue;
        const respMatch = respFilter === 'all' || p.responsavel === respFilter;
        return areaMatch && respMatch;
    });

    if (filteredProcesses.length === 0) {
        if (state.processes.length === 0) {
            emptyState.style.display = 'flex';
            document.getElementById('balancing-table').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            document.getElementById('balancing-table').style.display = 'table';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma atividade cadastrada nesta busca/filtro.</td>`;
            balancingBody.appendChild(tr);
        }
        updateBalancingCalculations();
        return;
    } else {
        emptyState.style.display = 'none';
        document.getElementById('balancing-table').style.display = 'table';
    }

    filteredProcesses.forEach(proc => {
        const tr = document.createElement('tr');
        tr.dataset.id = proc.id;
        tr.style.cursor = 'pointer';
        if (proc.reviewStatus === 'Parar') {
            tr.className = 'row-review-stopped';
        }
        
        const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
        const minutes = proc.minutos || 0;
        
        let volumeFieldHtml = '';
        if (proc.reviewStatus === 'Parar') {
            volumeFieldHtml = `<input type="text" class="input-backlog-volume" value="Parado (Sem FTE)" disabled style="opacity: 0.6; cursor: not-allowed; text-align: center; background: rgba(255, 255, 255, 0.02);">`;
        } else if (isTempoFrequencia) {
            volumeFieldHtml = `<input type="text" class="input-backlog-volume" value="Rotina (Fixa)" disabled style="opacity: 0.6; cursor: not-allowed; text-align: center; background: rgba(255, 255, 255, 0.02);">`;
        } else {
            const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
            const backlogVolVal = hasBacklog ? parseFloat(proc.backlogVolume) : '';
            volumeFieldHtml = `<input type="number" class="input-backlog-volume" value="${backlogVolVal}" placeholder="Digite o backlog" min="0">`;
        }
        
        const reviewBadgeHtml = proc.reviewStatus && proc.reviewStatus !== 'Manter'
            ? `<span class="badge-review badge-review-${proc.reviewStatus.toLowerCase()}">${proc.reviewStatus}</span>`
            : '';

        tr.innerHTML = `
            <td style="font-weight: 500;">
                ${escapeHtml(proc.name)}
                ${reviewBadgeHtml}
            </td>
            <td>
                <span class="badge" style="margin-left: 0; background: rgba(235, 92, 39, 0.15); border: 1px solid var(--color-primary); color: var(--color-primary); box-shadow: none;">
                    ${escapeHtml(proc.area)}
                </span>
            </td>
            <td>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(proc.responsavel || 'Sem ResponsÃ¡vel')}</span>
            </td>
            <td>${minutes.toFixed(0)} min</td>
            <td>
                ${volumeFieldHtml}
            </td>
            <td class="cell-backlog-hours">0.0h</td>
            <td class="cell-backlog-fte neon-text-secondary">0.00%</td>
        `;
        
        if (!isTempoFrequencia && proc.reviewStatus !== 'Parar') {
            const backlogInput = tr.querySelector('.input-backlog-volume');
            if (backlogInput) {
                backlogInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    proc.backlogVolume = val !== '' ? parseFloat(val) : '';
                    saveState();
                    updateBalancingCalculations();
                });
            }
        }
        
        // Click event to highlight corresponding area card on the right (ignore for ResponsÃ¡vel and Backlog inputs)
        tr.addEventListener('click', (e) => {
            const td = e.target.closest('td');
            if (!td) return;
            
            const cellIndex = Array.from(td.parentNode.children).indexOf(td) + 1;
            if (e.target.tagName === 'INPUT' || cellIndex === 3 || cellIndex === 5) {
                return;
            }
            
            const areaName = proc.area;
            highlightAndFocusArea(areaName);
        });
        
        balancingBody.appendChild(tr);
    });

    updateBalancingCalculations();
}

function highlightAndFocusArea(areaName) {
    document.querySelectorAll('.area-alloc-card').forEach(card => {
        card.classList.remove('active-highlight');
    });
    
    const card = document.querySelector(`.area-alloc-card[data-area="${areaName}"]`);
    if (card) {
        card.classList.add('active-highlight');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const input = card.querySelector('.input-area-allocation');
        if (input) {
            input.focus();
            input.select();
        }
    }
}

// UPDATE BULK DELETE ACTIONS VISIBILITY
function updateDeleteSelectedButton() {
    const checked = document.querySelectorAll('.row-checkbox:checked');
    const deleteBtn = document.getElementById('btn-delete-selected');
    const deleteCount = document.getElementById('delete-selected-count');
    
    if (deleteBtn && deleteCount) {
        if (checked.length > 0) {
            deleteBtn.style.display = 'inline-flex';
            deleteCount.textContent = checked.length;
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}

// SIMULATOR LOGIC & CALCULATION ENGINE (DASHBOARD TAB)
function updateCalculations() {
    const horasDia = state.params.horasDia;
    const absenteismo = state.params.absenteismo / 100;
    const diasUteis = state.params.diasUteis;
    const filterValue = document.getElementById('filter-area').value;

    const horasRealDia = horasDia * (1 - absenteismo);
    const horasTrabalhoMes = horasRealDia * diasUteis;

    // Render global read-only parameter fields
    const elHorasReal = document.getElementById('val-horas-real');
    if (elHorasReal) elHorasReal.textContent = horasRealDia.toFixed(1) + 'h';
    
    const elHorasMes = document.getElementById('val-horas-mes');
    if (elHorasMes) elHorasMes.textContent = horasTrabalhoMes.toFixed(1) + 'h';
    
    const countBadge = document.getElementById('activity-count');
    if (countBadge) countBadge.textContent = state.processes.length;

    // Update Slider Displays
    const elValHorasDia = document.getElementById('val-horas-dia');
    if (elValHorasDia) elValHorasDia.textContent = horasDia.toFixed(1) + 'h';
    
    const elValAbs = document.getElementById('val-absenteismo');
    if (elValAbs) elValAbs.textContent = state.params.absenteismo + '%';
    
    const elValDias = document.getElementById('val-dias-uteis');
    if (elValDias) elValDias.textContent = diasUteis + 'd';

    let totalHoursAccum = 0;
    let totalFtePctAccum = 0;
    let filteredHoursAccum = 0;
    let filteredFtePctAccum = 0;

    const respFilter = document.getElementById('filter-responsavel').value;

    // Calculate details and update DOM rows directly
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const id = row.dataset.id;
        const proc = state.processes.find(p => p.id === id);
        if (!proc) return;

        const isStopped = proc.reviewStatus === 'Parar';
        const hasVolume = proc.volume !== null && proc.volume !== '';
        const multiplier = isStopped ? 0 : (hasVolume ? parseFloat(proc.volume) : (proc.qtdExecucao !== null && proc.qtdExecucao !== '' ? parseFloat(proc.qtdExecucao) : 0));
        const minutes = isStopped ? 0 : (proc.minutos !== null && proc.minutos !== '' ? parseFloat(proc.minutos) : 0);
        
        const totalMinutes = multiplier * minutes;
        const totalHours = totalMinutes / 60;
        
        // Dynamic capacity per process
        const respParams = getResponsibleParams(proc.responsavel);
        const pHorasRealDia = respParams.horasDia * (1 - respParams.absenteismo / 100);
        const pHorasTrabalhoMes = pHorasRealDia * respParams.diasUteis;
        const ftePct = pHorasTrabalhoMes > 0 ? (totalHours / pHorasTrabalhoMes) * 100 : 0;

        filteredHoursAccum += totalHours;
        filteredFtePctAccum += ftePct;

        // Update cells directly in DOM
        const hoursCell = row.querySelector('.cell-hours');
        const pctCell = row.querySelector('.cell-highlight-pct');
        if (hoursCell) hoursCell.textContent = totalHours.toFixed(1) + 'h';
        if (pctCell) pctCell.textContent = ftePct.toFixed(2) + '%';
    });

    // Calculate global stats (over ALL processes, even hidden ones)
    state.processes.forEach(proc => {
        const isStopped = proc.reviewStatus === 'Parar';
        const hasVolume = proc.volume !== null && proc.volume !== '';
        const multiplier = isStopped ? 0 : (hasVolume ? parseFloat(proc.volume) : (proc.qtdExecucao !== null && proc.qtdExecucao !== '' ? parseFloat(proc.qtdExecucao) : 0));
        const minutes = isStopped ? 0 : (proc.minutos !== null && proc.minutos !== '' ? parseFloat(proc.minutos) : 0);
        
        const totalMinutes = multiplier * minutes;
        const totalHours = totalMinutes / 60;
        
        // Dynamic capacity per process
        const respParams = getResponsibleParams(proc.responsavel);
        const pHorasRealDia = respParams.horasDia * (1 - respParams.absenteismo / 100);
        const pHorasTrabalhoMes = pHorasRealDia * respParams.diasUteis;
        const ftePct = pHorasTrabalhoMes > 0 ? (totalHours / pHorasTrabalhoMes) * 100 : 0;

        totalHoursAccum += totalHours;
        totalFtePctAccum += ftePct;
    });

    const totalFteDecAccum = totalFtePctAccum / 100;

    // Render Totals Rows
    document.getElementById('total-hours').textContent = totalHoursAccum.toFixed(1) + 'h';
    document.getElementById('total-fte-pct').textContent = totalFtePctAccum.toFixed(2) + '%';

    const rowTotalFiltered = document.getElementById('row-total-filtered');
    if (filterValue !== 'all') {
        rowTotalFiltered.style.display = 'table-row';
        document.getElementById('total-hours-filtered').textContent = filteredHoursAccum.toFixed(1) + 'h';
        document.getElementById('total-fte-pct-filtered').textContent = filteredFtePctAccum.toFixed(2) + '%';
    } else {
        rowTotalFiltered.style.display = 'none';
    }

    // Render Summary Widgets
    document.getElementById('widget-fte-required').textContent = totalFteDecAccum.toFixed(2);
    
    // Update total activity count widget
    const widgetActivity = document.getElementById('widget-activity-count');
    if (widgetActivity) {
        widgetActivity.textContent = state.processes.length;
    }

    // Update placeholders for responsible overrides inputs in-place to avoid re-rendering layout
    const horasInputs = document.querySelectorAll('.override-horas');
    horasInputs.forEach(inp => {
        inp.placeholder = `${horasDia.toFixed(1)} (PadrÃ£o)`;
    });
    const absInputs = document.querySelectorAll('.override-absenteismo');
    absInputs.forEach(inp => {
        inp.placeholder = `${state.params.absenteismo}%`;
    });
    const diasInputs = document.querySelectorAll('.override-dias');
    diasInputs.forEach(inp => {
        inp.placeholder = `${diasUteis}d`;
    });

    saveState();
    renderCharts(totalFteDecAccum);

    // Propagate changes to balancing calculations if elements are loaded
    if (document.getElementById('balancing-table-body')) {
        updateBalancingCalculations();
    }
}

// UPDATE BALANCE LOGIC & CALCULATIONS (BALANCEAMENTO TAB)
function updateBalancingCalculations() {
    const teamSize = state.params.teamSize;
    const filterValue = document.getElementById('filter-area-balancing').value;

    let totalHoursAccum = 0;
    let totalFtePctAccum = 0;
    let filteredHoursAccum = 0;
    let filteredFtePctAccum = 0;

    const respFilter = document.getElementById('filter-responsavel-balancing').value;

    // Calculate row values in Balancing view DOM
    const rows = document.querySelectorAll('#balancing-table-body tr');
    rows.forEach(row => {
        const id = row.dataset.id;
        const proc = state.processes.find(p => p.id === id);
        if (!proc) return;

        const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
        const minutes = proc.minutos || 0;
        const isStopped = proc.reviewStatus === 'Parar';

        const respParams = getResponsibleParams(proc.responsavel);
        const pHorasRealDia = respParams.horasDia * (1 - respParams.absenteismo / 100);

        let totalHoursRow = 0;
        if (!isStopped) {
            if (isTempoFrequencia) {
                // Tempo x FrequÃªncia: distributed evenly across working days
                const qtdExec = parseFloat(proc.qtdExecucao) || 0;
                totalHoursRow = (qtdExec * minutes) / 60 / respParams.diasUteis;
            } else {
                // Volume x Tempo: backlog to clear in the day
                const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
                const backlogVol = hasBacklog ? parseFloat(proc.backlogVolume) : 0;
                totalHoursRow = (backlogVol * minutes) / 60;
            }
        }

        const ftePct = pHorasRealDia > 0 ? (totalHoursRow / pHorasRealDia) * 100 : 0;

        filteredHoursAccum += totalHoursRow;
        filteredFtePctAccum += ftePct;

        // Update row columns directly in DOM
        const hoursCell = row.querySelector('.cell-backlog-hours');
        const fteCell = row.querySelector('.cell-backlog-fte');
        if (hoursCell) hoursCell.textContent = totalHoursRow.toFixed(1) + 'h';
        if (fteCell) fteCell.textContent = ftePct.toFixed(2) + '%';
    });

    // Calculate global stats (over ALL processes backlog volumes and routines)
    state.processes.forEach(proc => {
        const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
        const minutes = proc.minutos || 0;
        const isStopped = proc.reviewStatus === 'Parar';

        const respParams = getResponsibleParams(proc.responsavel);
        const pHorasRealDia = respParams.horasDia * (1 - respParams.absenteismo / 100);

        let totalHoursRow = 0;
        if (!isStopped) {
            if (isTempoFrequencia) {
                const qtdExec = parseFloat(proc.qtdExecucao) || 0;
                totalHoursRow = (qtdExec * minutes) / 60 / respParams.diasUteis;
            } else {
                const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
                const backlogVol = hasBacklog ? parseFloat(proc.backlogVolume) : 0;
                totalHoursRow = (backlogVol * minutes) / 60;
            }
        }

        const ftePct = pHorasRealDia > 0 ? (totalHoursRow / pHorasRealDia) * 100 : 0;

        totalHoursAccum += totalHoursRow;
        totalFtePctAccum += ftePct;
    });

    const totalFteDecAccum = totalFtePctAccum / 100;

    // Render Balancing Totals
    document.getElementById('balancing-total-hours').textContent = totalHoursAccum.toFixed(1) + 'h';
    document.getElementById('balancing-total-fte-pct').textContent = totalFtePctAccum.toFixed(2) + '%';

    const rowTotalFiltered = document.getElementById('balancing-row-total-filtered');
    if (filterValue !== 'all') {
        rowTotalFiltered.style.display = 'table-row';
        document.getElementById('balancing-total-hours-filtered').textContent = filteredHoursAccum.toFixed(1) + 'h';
        document.getElementById('balancing-total-fte-pct-filtered').textContent = filteredFtePctAccum.toFixed(2) + '%';
    } else {
        rowTotalFiltered.style.display = 'none';
    }

    // Update Balancing Top Widgets
    document.getElementById('widget-backlog-hours').textContent = totalHoursAccum.toFixed(1) + 'h';
    document.getElementById('widget-backlog-fte').textContent = totalFteDecAccum.toFixed(2);



    // Update Area Allocations Side Panel
    renderAreaAllocations();
}

function renderAreaAllocations() {
    const listContainer = document.getElementById('area-allocations-list');
    if (!listContainer) return;
    
    const areas = ['Backoffice', 'GovernanÃ§a', 'Seguros/N2', 'EficiÃªncia Operacional', ...state.customAreas];
    
    const horasDia = state.params.horasDia;
    const absenteismo = state.params.absenteismo / 100;
    const horasRealDia = horasDia * (1 - absenteismo);
    const diasUteis = state.params.diasUteis;
    
    // Check if we need to do a full rebuild or if we can just update in place
    const existingCards = listContainer.querySelectorAll('.area-alloc-card');
    const needsFullRebuild = existingCards.length !== areas.length;
    
    if (needsFullRebuild) {
        listContainer.innerHTML = '';
    }
    
    areas.forEach(areaName => {
        let areaDailyHours = 0;
        
        state.processes.forEach(proc => {
            if (proc.area !== areaName) return;
            if (proc.reviewStatus === 'Parar') return;
            
            const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
            const minutes = proc.minutos || 0;
            
            if (isTempoFrequencia) {
                const qtdExec = parseFloat(proc.qtdExecucao) || 0;
                areaDailyHours += (qtdExec * minutes) / 60 / diasUteis;
            } else {
                const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
                const backlogVol = hasBacklog ? parseFloat(proc.backlogVolume) : 0;
                areaDailyHours += (backlogVol * minutes) / 60;
            }
        });
        
        const requiredFte = horasRealDia > 0 ? (areaDailyHours / horasRealDia) : 0;
        
        const allocatedNum = (state.responsaveis || []).filter(r => r.area === areaName).length;
        
        let statusHtml = '';
        if (allocatedNum === 0) {
            if (requiredFte > 0) {
                statusHtml = `<span class="badge" style="margin-left: 0; background: rgba(244, 63, 94, 0.15); border: 1px solid #f43f5e; color: #f43f5e; box-shadow: none;">Inferior</span>`;
            } else {
                statusHtml = `<span class="badge" style="margin-left: 0; background: rgba(14, 165, 233, 0.15); border: 1px solid #0ea5e9; color: #0ea5e9; box-shadow: none;">Equivalente</span>`;
            }
        } else {
            const diff = allocatedNum - requiredFte;
            if (Math.abs(diff) < 0.05) {
                statusHtml = `<span class="badge" style="margin-left: 0; background: rgba(14, 165, 233, 0.15); border: 1px solid #0ea5e9; color: #0ea5e9; box-shadow: none;">Equivalente</span>`;
            } else if (diff > 0) {
                statusHtml = `<span class="badge" style="margin-left: 0; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; box-shadow: none;">Superior</span>`;
            } else {
                statusHtml = `<span class="badge" style="margin-left: 0; background: rgba(244, 63, 94, 0.15); border: 1px solid #f43f5e; color: #f43f5e; box-shadow: none;">Inferior</span>`;
            }
        }
        
        if (!needsFullRebuild) {
            // Update in place to preserve input focus
            const card = listContainer.querySelector(`.area-alloc-card[data-area="${areaName}"]`);
            if (card) {
                const header = card.querySelector('.area-alloc-header');
                if (header) {
                    header.innerHTML = `<span class="area-alloc-name">${escapeHtml(areaName)}</span> ${statusHtml}`;
                }
                const statVal = card.querySelector('.area-alloc-stat span');
                if (statVal) {
                    statVal.textContent = requiredFte.toFixed(2);
                }
                const allocValDiv = card.querySelector('.area-allocation-value');
                if (allocValDiv) {
                    allocValDiv.textContent = allocatedNum;
                }
            }
        } else {
            // Create new card
            const card = document.createElement('div');
            card.className = 'area-alloc-card';
            card.dataset.area = areaName;
            
            card.innerHTML = `
                <div class="area-alloc-header">
                    <span class="area-alloc-name">${escapeHtml(areaName)}</span>
                    ${statusHtml}
                </div>
                <div class="area-alloc-body">
                    <div class="area-alloc-stat">
                        FTE Requerido: <span>${requiredFte.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Alocado:</span>
                        <div class="area-allocation-value" style="padding: 0.2rem 0.6rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; font-weight: 500; font-size: 0.9rem; min-width: 40px; text-align: center;">
                            ${allocatedNum}
                        </div>
                    </div>
                </div>
            `;
            
            listContainer.appendChild(card);
        }
    });
}

// NEW PROCESS MANAGEMENT
function addNewProcess() {
    if (!verificarPermissao('OPERADOR')) { alert('Acesso negado: Perfil OPERADOR necessÃ¡rio.'); return; }
    const newId = 'proc-' + Date.now();
    const defaultArea = state.teams.length > 0 ? state.teams[0] : '';
    
    state.processes.push({
        id: newId,
        name: `Nova Atividade ${state.processes.length + 1}`,
        area: defaultArea,
        responsavel: '',
        volume: '',
        minutos: 0,
        qtdExecucao: '',
        backlogVolume: '',
        allocatedResource: '',
        reviewStatus: 'Manter'
    });
    saveState();
    
    renderCadastrosView();
    renderTable();
    renderBalancingTable();
    renderReviewTable();
}

function deleteProcess(id) {
    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
    state.processes = state.processes.filter(p => p.id !== id);
    renderTable();
    renderBalancingTable();
}

function duplicateProcess(proc) {
    if (!verificarPermissao('OPERADOR')) { alert('Acesso negado: Perfil OPERADOR necessÃ¡rio.'); return; }
    const newId = 'proc-' + Date.now() + '-' + Math.floor(Math.random() * 100);
    state.processes.push({
        id: newId,
        name: `${proc.name} (CÃ³pia)`,
        area: proc.area,
        volume: proc.volume,
        minutos: proc.minutos,
        qtdExecucao: proc.qtdExecucao,
        backlogVolume: proc.backlogVolume,
        allocatedResource: proc.allocatedResource || '',
        reviewStatus: proc.reviewStatus || 'Manter'
    });
    renderTable();
    renderBalancingTable();
}

function loadExampleData() {
    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
    state.processes = JSON.parse(JSON.stringify(EXAMPLE_PROCESSES));
    state.params = {
        horasDia: 8.0,
        absenteismo: 20,
        diasUteis: 21,
        teamSize: 5.0
    };
    state.customAreas = [];
    state.teams = ['Backoffice', 'GovernanÃ§a', 'Seguros/N2', 'EficiÃªncia Operacional'];
    state.teamHierarchy = {
        'Backoffice': { gerencia: 'ConciliaÃ§Ã£o', diretoria: 'OperaÃ§Ãµes' },
        'GovernanÃ§a': { gerencia: 'Suporte Operacional', diretoria: 'OperaÃ§Ãµes' },
        'Seguros/N2': { gerencia: 'Atendimento', diretoria: 'OperaÃ§Ãµes' },
        'EficiÃªncia Operacional': { gerencia: 'Suporte Operacional', diretoria: 'OperaÃ§Ãµes' }
    };
    
    const uniqueResps = [...new Set(state.processes.map(p => p.responsavel || '').filter(r => r.trim() !== ''))].sort();
    state.responsaveis = uniqueResps.map(r => {
        const procWithResp = state.processes.find(p => p.responsavel === r);
        const inheritedArea = procWithResp ? procWithResp.area : '';
        return { name: r, area: inheritedArea, horasDia: null, absenteismo: null, diasUteis: null };
    });
    
    const elInputHoras = document.getElementById('input-horas-dia');
    if (elInputHoras) elInputHoras.value = 8.0;
    const elInputAbs = document.getElementById('input-absenteismo');
    if (elInputAbs) elInputAbs.value = 20;
    const elInputDias = document.getElementById('input-dias-uteis');
    if (elInputDias) elInputDias.value = 21;
    const elInputTeam = document.getElementById('input-team-size');
    if (elInputTeam) elInputTeam.value = 5.0;
    document.getElementById('filter-area').value = 'all';
    document.getElementById('filter-area-balancing').value = 'all';
    document.getElementById('filter-area-review').value = 'all';
    document.getElementById('filter-responsavel').value = 'all';
    document.getElementById('filter-responsavel-balancing').value = 'all';
    document.getElementById('filter-responsavel-review').value = 'all';

    renderAreaFilterOptions();
    renderResponsavelFilterOptions();
    renderTable();
    renderBalancingTable();
}

function resetSimulator() {
    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
    state.processes = [];
    document.getElementById('filter-area').value = 'all';
    document.getElementById('filter-area-balancing').value = 'all';
    document.getElementById('filter-area-review').value = 'all';
    document.getElementById('filter-responsavel').value = 'all';
    document.getElementById('filter-responsavel-balancing').value = 'all';
    document.getElementById('filter-responsavel-review').value = 'all';
    
    renderAreaFilterOptions();
    renderResponsavelFilterOptions();
    renderTable();
    renderBalancingTable();
}

// CHART RENDER ENGINE (Grouped by Area or Process based on filter selection)
function renderCharts(totalFteRequired) {
    const isDark = document.body.classList.contains('dark-theme');
    
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-secondary').trim();
    const gridColor = style.getPropertyValue('--border-color').trim();
    const primaryColor = style.getPropertyValue('--color-primary').trim();
    const successColor = style.getPropertyValue('--color-success').trim();

    // 1. Doughnut Chart (Aggregated by Area or by Process)
    const pieCanvas = document.getElementById('chart-pie');
    if (!pieCanvas) return;

    const filterValue = document.getElementById('filter-area').value;
    const chartTitleElement = document.getElementById('chart-pie-title');

    const areaMap = {};
    const processMap = {};
    const horasRealDia = state.params.horasDia * (1 - state.params.absenteismo / 100);
    const horasTrabalhoMes = horasRealDia * state.params.diasUteis;

    // Filter processes list based on active area selection
    const filteredList = filterValue === 'all' 
        ? state.processes 
        : state.processes.filter(p => p.area === filterValue);

    filteredList.forEach(p => {
        const hasVolume = p.volume !== null && p.volume !== '';
        const multiplier = hasVolume ? parseFloat(p.volume) : (p.qtdExecucao !== null && p.qtdExecucao !== '' ? parseFloat(p.qtdExecucao) : 0);
        const minutes = p.minutos !== null && p.minutos !== '' ? parseFloat(p.minutos) : 0;
        
        const totalHours = (multiplier * minutes) / 60;
        const fte = horasTrabalhoMes > 0 ? (totalHours / horasTrabalhoMes) : 0;

        if (filterValue === 'all') {
            const areaName = p.area || 'Outras';
            if (!areaMap[areaName]) {
                areaMap[areaName] = 0;
            }
            areaMap[areaName] += fte;
        } else {
            const procName = p.name || 'Sem nome';
            if (!processMap[procName]) {
                processMap[procName] = 0;
            }
            processMap[procName] += fte;
        }
    });

    let pieLabels = [];
    let pieData = [];

    if (filterValue === 'all') {
        pieLabels = Object.keys(areaMap).filter(k => areaMap[k] > 0);
        pieData = pieLabels.map(k => parseFloat(areaMap[k].toFixed(2)));
        if (chartTitleElement) {
            chartTitleElement.innerHTML = '<i class="fa-solid fa-chart-pie"></i> DistribuiÃ§Ã£o de FTE por Ãrea';
        }
    } else {
        pieLabels = Object.keys(processMap).filter(k => processMap[k] > 0);
        pieData = pieLabels.map(k => parseFloat(processMap[k].toFixed(2)));
        if (chartTitleElement) {
            chartTitleElement.innerHTML = `<i class="fa-solid fa-chart-pie"></i> DistribuiÃ§Ã£o de FTE em ${filterValue}`;
        }
    }

    const chartColors = [
        '#eb5c27', '#e55f91', '#043e26', '#10b981', '#f59e0b', 
        '#6366f1', '#0ea5e9', '#ec4899', '#14b8a6', '#84cc16'
    ];

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    if (pieData.length === 0) {
        pieChartInstance = new Chart(pieCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Nenhuma Ã¡rea com dados'],
                datasets: [{
                    data: [1],
                    backgroundColor: [isDark ? '#081e13' : '#cbd5e1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: textColor } },
                    tooltip: { enabled: false }
                }
            }
        });
    } else {
        pieChartInstance = new Chart(pieCanvas, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: chartColors.slice(0, pieData.length),
                    borderColor: isDark ? '#081e13' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { family: 'Outfit', size: 11 },
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw.toFixed(2)} FTE`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // 2. Bar Chart (Capacity vs Demand)
    const barCanvas = document.getElementById('chart-bar');
    if (!barCanvas) return;

    if (barChartInstance) {
        barChartInstance.destroy();
    }

    const availableFte = state.params.teamSize;

    barChartInstance = new Chart(barCanvas, {
        type: 'bar',
        data: {
            labels: ['Capacidade do Time', 'Demanda Requerida'],
            datasets: [{
                label: 'FTEs',
                data: [availableFte, totalFteRequired],
                backgroundColor: [
                    successColor,
                    totalFteRequired > availableFte ? '#f43f5e' : primaryColor
                ],
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: textColor,
                        font: { family: 'Outfit', size: 12, weight: '600' }
                    }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: 'Outfit' }
                    },
                    suggestedMax: Math.max(availableFte, totalFteRequired) * 1.2
                }
            }
        }
    });
}

function updateChartsTheme() {
    if (pieChartInstance && barChartInstance) {
        const style = getComputedStyle(document.body);
        const textColor = style.getPropertyValue('--text-secondary').trim();
        const gridColor = style.getPropertyValue('--border-color').trim();

        // Update Pie Chart Labels
        pieChartInstance.options.plugins.legend.labels.color = textColor;
        pieChartInstance.update();

        // Update Bar Chart Labels
        barChartInstance.options.scales.x.ticks.color = textColor;
        barChartInstance.options.scales.y.ticks.color = textColor;
        barChartInstance.options.scales.y.grid.color = gridColor;
        barChartInstance.update();
    }
}

// EXPORT TO CSV (Excel Compatible - Exports active tab content)
function exportToCSV() {
    if (state.processes.length === 0) {
        alert("NÃ£o hÃ¡ dados para exportar.");
        return;
    }

    const activeMenuItem = document.querySelector('.sidebar-menu .menu-item.active');
    const activeTab = activeMenuItem ? activeMenuItem.dataset.view : 'dashboard';

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel Portuguese encoding
    
    // Global parameters
    const horasRealDia = state.params.horasDia * (1 - state.params.absenteismo / 100);
    const horasTrabalhoMes = horasRealDia * state.params.diasUteis;
    const diasUteis = state.params.diasUteis;

    csvContent += "PARAMETROS GLOBAIS\n";
    csvContent += `Horas Trabalho / Dia;${state.params.horasDia}\n`;
    csvContent += `AbsenteÃ­smo (%);${state.params.absenteismo}%\n`;
    csvContent += `Dias Ãšteis;${state.params.diasUteis}\n`;
    csvContent += `Horas Trabalho Real / Dia;${horasRealDia.toFixed(2)}\n`;
    csvContent += `Horas Trabalho MÃªs (1 FTE);${horasTrabalhoMes.toFixed(2)}\n`;
    csvContent += `Tamanho da Equipe (DisponÃ­vel);${state.params.teamSize}\n\n`;

    if (activeTab === 'dashboard') {
        csvContent += "RELATORIO DE CAPACIDADE E FTE (DASHBOARD)\n";
        csvContent += "PROCESSO;AREA RESPONSAVEL;VOLUME MES;MINUTOS UNITARIO;QTD EXECUCAO MES;TOTAL HORAS MES;FTE %\n";

        let totalHours = 0;
        let totalFtePct = 0;

        state.processes.forEach(proc => {
            const hasVolume = proc.volume !== null && proc.volume !== '';
            const multiplier = hasVolume ? parseFloat(proc.volume) : (proc.qtdExecucao !== null && proc.qtdExecucao !== '' ? parseFloat(proc.qtdExecucao) : 0);
            const minutes = proc.minutos !== null && proc.minutos !== '' ? parseFloat(proc.minutos) : 0;
            
            const totalHoursRow = (multiplier * minutes) / 60;
            const ftePct = horasTrabalhoMes > 0 ? (totalHoursRow / horasTrabalhoMes) * 100 : 0;

            totalHours += totalHoursRow;
            totalFtePct += ftePct;

            const name = `"${(proc.name || '').replace(/"/g, '""')}"`;
            const area = `"${(proc.area || '').replace(/"/g, '""')}"`;
            const vol = proc.volume !== '' ? proc.volume : '""';
            const mins = proc.minutos !== '' ? proc.minutos : 0;
            const qtd = proc.qtdExecucao !== '' ? proc.qtdExecucao : '""';

            csvContent += `${name};${area};${vol};${mins};${qtd};${totalHoursRow.toFixed(2).replace('.', ',')};${ftePct.toFixed(2).replace('.', ',')}%\n`;
        });

        csvContent += `TOTAL GERAL;;;;;;${totalHours.toFixed(2).replace('.', ',')};${totalFtePct.toFixed(2).replace('.', ',')}%\n`;
    } else {
        csvContent += "RELATORIO DE BALANCEAMENTO DE BACKLOG (DIARIO) - ATIVIDADES\n";
        csvContent += "PROCESSO;AREA RESPONSAVEL;TEMPO UNITARIO (MIN);TIPO ATIVIDADE;VOLUME BACKLOG / DIARIO;TOTAL HORAS REQUERIDAS DIA;FTE REQUERIDO DIA %\n";

        let totalHours = 0;
        let totalFtePct = 0;

        state.processes.forEach(proc => {
            const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
            const minutes = proc.minutos || 0;
            
            let totalHoursRow = 0;
            let typeStr = "";
            let volStr = "";

            if (isTempoFrequencia) {
                const qtdExec = parseFloat(proc.qtdExecucao) || 0;
                totalHoursRow = (qtdExec * minutes) / 60 / diasUteis;
                typeStr = "Tempo x Frequencia (Rotina Fixa)";
                volStr = `Rotina (${(qtdExec / diasUteis).toFixed(2)}/dia)`;
            } else {
                const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
                const backlogVol = hasBacklog ? parseFloat(proc.backlogVolume) : 0;
                totalHoursRow = (backlogVol * minutes) / 60;
                typeStr = "Volume x Tempo (Variavel)";
                volStr = hasBacklog ? proc.backlogVolume : "0";
            }

            const ftePct = horasRealDia > 0 ? (totalHoursRow / horasRealDia) * 100 : 0;

            totalHours += totalHoursRow;
            totalFtePct += ftePct;

            const name = `"${(proc.name || '').replace(/"/g, '""')}"`;
            const area = `"${(proc.area || '').replace(/"/g, '""')}"`;
            const mins = proc.minutos !== '' ? proc.minutos : 0;

            csvContent += `${name};${area};${mins};${typeStr};${volStr};${totalHoursRow.toFixed(2).replace('.', ',')};${ftePct.toFixed(2).replace('.', ',')}%\n`;
        });

        csvContent += `TOTAL GERAL;;;;;${totalHours.toFixed(2).replace('.', ',')};${totalFtePct.toFixed(2).replace('.', ',')}%\n\n`;

        // SECOND SECTION: AREA ALLOCATIONS
        csvContent += "BALANCEAMENTO DE CAPACIDADE POR EQUIPE / AREA\n";
        csvContent += "AREA / EQUIPE;FTE REQUERIDO DIARIO;RECURSO ALOCADO (FTE);STATUS CAPACIDADE\n";

        const areasList = ['Backoffice', 'GovernanÃ§a', 'Seguros/N2', 'EficiÃªncia Operacional', ...state.customAreas];
        let sumRequiredFte = 0;
        let sumAllocatedFte = 0;

        areasList.forEach(areaName => {
            let areaDailyHours = 0;
            state.processes.forEach(proc => {
                if (proc.area !== areaName) return;
                const isTempoFrequencia = proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0;
                const minutes = proc.minutos || 0;
                
                if (isTempoFrequencia) {
                    const qtdExec = parseFloat(proc.qtdExecucao) || 0;
                    areaDailyHours += (qtdExec * minutes) / 60 / diasUteis;
                } else {
                    const hasBacklog = proc.backlogVolume !== undefined && proc.backlogVolume !== '';
                    const backlogVol = hasBacklog ? parseFloat(proc.backlogVolume) : 0;
                    areaDailyHours += (backlogVol * minutes) / 60;
                }
            });

            const requiredFte = horasRealDia > 0 ? (areaDailyHours / horasRealDia) : 0;
            const allocatedVal = state.areaAllocations[areaName] !== undefined && state.areaAllocations[areaName] !== '' ? parseFloat(state.areaAllocations[areaName]) : 0;

            let statusStr = "";
            if (allocatedVal === 0) {
                statusStr = requiredFte > 0 ? "Inferior" : "Equivalente";
            } else {
                const diff = allocatedVal - requiredFte;
                if (Math.abs(diff) < 0.05) {
                    statusStr = "Equivalente";
                } else if (diff > 0) {
                    statusStr = "Superior";
                } else {
                    statusStr = "Inferior";
                }
            }

            sumRequiredFte += requiredFte;
            sumAllocatedFte += allocatedVal;

            csvContent += `"${areaName.replace(/"/g, '""')}";${requiredFte.toFixed(2).replace('.', ',')};${allocatedVal.toFixed(2).replace('.', ',')};${statusStr}\n`;
        });

        csvContent += `TOTAL GERAL;${sumRequiredFte.toFixed(2).replace('.', ',')};${sumAllocatedFte.toFixed(2).replace('.', ',')};\n`;
    }

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Capacity_FTE_${activeTab === 'dashboard' ? 'Report' : 'Backlog'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// HELPER: HTML ESCAPE
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// DYNAMICALLY RENDER THE FILTER OPTIONS FOR AREAS (ALL TABLES)
function renderAreaFilterOptions() {
    const filterSelect = document.getElementById('filter-area');
    const filterSelectBalancing = document.getElementById('filter-area-balancing');
    const filterSelectReview = document.getElementById('filter-area-review');
    if (!filterSelect || !filterSelectBalancing || !filterSelectReview) return;
    
    const currentValue = filterSelect.value;
    const currentValueBalancing = filterSelectBalancing.value;
    const currentValueReview = filterSelectReview.value;
    
    const optionsHtml = '<option value="all">Todas as Ãreas</option>' +
        (state.teams || []).map(area =>
            `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`
        ).join('');
        
    filterSelect.innerHTML = optionsHtml;
    filterSelectBalancing.innerHTML = optionsHtml;
    filterSelectReview.innerHTML = optionsHtml;
    
    const allAreas = state.teams || [];
    
    if (allAreas.includes(currentValue)) {
        filterSelect.value = currentValue;
    } else {
        filterSelect.value = 'all';
    }
    
    if (allAreas.includes(currentValueBalancing)) {
        filterSelectBalancing.value = currentValueBalancing;
    } else {
        filterSelectBalancing.value = 'all';
    }

    if (allAreas.includes(currentValueReview)) {
        filterSelectReview.value = currentValueReview;
    } else {
        filterSelectReview.value = 'all';
    }
}

// RENDER THE ACTIVITIES REVIEW TABLE (NEW TAB)
function renderReviewTable() {
    const tableBody = document.getElementById('review-table-body');
    const emptyState = document.getElementById('review-empty-state');
    const filterValue = document.getElementById('filter-area-review').value;
    const respFilter = document.getElementById('filter-responsavel-review').value;

    if (!tableBody) return;
    tableBody.innerHTML = '';

    const filteredProcesses = state.processes.filter(p => {
        const areaMatch = filterValue === 'all' || p.area === filterValue;
        const respMatch = respFilter === 'all' || p.responsavel === respFilter;
        return areaMatch && respMatch;
    });

    if (filteredProcesses.length === 0) {
        emptyState.style.display = 'block';
        document.getElementById('review-table').style.display = 'none';
        
        // Zero widgets
        document.getElementById('widget-review-manter').textContent = '0';
        document.getElementById('widget-review-parar').textContent = '0';
        document.getElementById('widget-review-comecar').textContent = '0';
        return;
    }

    emptyState.style.display = 'none';
    document.getElementById('review-table').style.display = 'table';

    // Counts for widgets
    let countManter = 0;
    let countParar = 0;
    let countComecar = 0;

    state.processes.forEach(p => {
        const status = p.reviewStatus || 'Manter';
        if (status === 'Manter') countManter++;
        else if (status === 'Parar') countParar++;
        else if (status === 'ComeÃ§ar') countComecar++;
    });

    document.getElementById('widget-review-manter').textContent = countManter;
    document.getElementById('widget-review-parar').textContent = countParar;
    document.getElementById('widget-review-comecar').textContent = countComecar;

    filteredProcesses.forEach(proc => {
        // Calculate FTE (%) for the row using dynamic capacity per process
        const hasVolume = proc.volume !== null && proc.volume !== '';
        const multiplier = hasVolume ? parseFloat(proc.volume) : (proc.qtdExecucao !== null && proc.qtdExecucao !== '' ? parseFloat(proc.qtdExecucao) : 0);
        const minutes = proc.minutos !== null && proc.minutos !== '' ? parseFloat(proc.minutos) : 0;
        const totalHours = (multiplier * minutes) / 60;
        
        const respParams = getResponsibleParams(proc.responsavel);
        const pHorasRealDia = respParams.horasDia * (1 - respParams.absenteismo / 100);
        const pHorasTrabalhoMes = pHorasRealDia * respParams.diasUteis;
        const ftePct = pHorasTrabalhoMes > 0 ? (totalHours / pHorasTrabalhoMes) * 100 : 0;

        // Metric Description (read-only)
        let metricDesc = '';
        if (proc.qtdExecucao !== null && proc.qtdExecucao !== '' && parseFloat(proc.qtdExecucao) > 0) {
            metricDesc = `Tempo x Freq: ${proc.minutos}m / ${proc.qtdExecucao}x`;
        } else {
            metricDesc = `Vol x Tempo: ${proc.volume || 0}v / ${proc.minutos}m`;
        }

        // Review Action select box
        const statusOptions = ['Manter', 'Parar', 'ComeÃ§ar'];
        const statusOptionsHtml = statusOptions.map(opt =>
            `<option value="${opt}" ${proc.reviewStatus === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');
        const statusSelectHtml = `<select class="select-review-status" data-id="${proc.id}" data-status="${proc.reviewStatus || 'Manter'}">${statusOptionsHtml}</select>`;

        const tr = document.createElement('tr');
        if (proc.reviewStatus === 'Parar') {
            tr.className = 'row-review-stopped';
        }

        tr.innerHTML = `
            <td style="font-weight: 600;">
                ${escapeHtml(proc.name)}
                ${proc.reviewStatus && proc.reviewStatus !== 'Manter' ? `<span class="badge-review badge-review-${proc.reviewStatus.toLowerCase()}">${proc.reviewStatus}</span>` : ''}
            </td>
            <td>
                <span class="badge-area" style="font-size: 0.85rem; padding: 0.25rem 0.5rem; border-radius: 4px; background: rgba(235, 92, 39, 0.08); color: var(--color-primary); border: 1px solid rgba(235, 92, 39, 0.15);">${escapeHtml(proc.area || 'Sem Equipe')}</span>
            </td>
            <td>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(proc.responsavel || 'Sem ResponsÃ¡vel')}</span>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${metricDesc}</td>
            <td style="font-weight: 700; color: ${proc.reviewStatus === 'Parar' ? 'var(--text-muted)' : 'var(--text-primary)'};">${proc.reviewStatus === 'Parar' ? '0.00%' : ftePct.toFixed(2) + '%'}</td>
            <td>${statusSelectHtml}</td>
        `;

        const statusSelect = tr.querySelector('.select-review-status');
        statusSelect.addEventListener('change', (e) => {
            const newStatus = e.target.value;
            proc.reviewStatus = newStatus;
            saveState();
            // Re-render and recalculate everything
            renderReviewTable();
        });

        tableBody.appendChild(tr);
    });
}

// DYNAMICALLY RENDER THE FILTER OPTIONS FOR OWNER/RESPONSIBLE (ALL TABLES)
function renderResponsavelFilterOptions() {
    const filterSelect = document.getElementById('filter-responsavel');
    const filterSelectBalancing = document.getElementById('filter-responsavel-balancing');
    const filterSelectReview = document.getElementById('filter-responsavel-review');
    if (!filterSelect || !filterSelectBalancing || !filterSelectReview) return;
    
    const currentValue = filterSelect.value;
    const currentValueBalancing = filterSelectBalancing.value;
    const currentValueReview = filterSelectReview.value;
    
    // Get all registered responsaveis
    const uniqueResponsaveis = state.responsaveis || [];
    const names = uniqueResponsaveis.map(r => r.name);
    
    const optionsHtml = '<option value="all">Todos os ResponsÃ¡veis</option>' +
        names.map(name =>
            `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
        ).join('');
        
    filterSelect.innerHTML = optionsHtml;
    filterSelectBalancing.innerHTML = optionsHtml;
    filterSelectReview.innerHTML = optionsHtml;
    
    if (names.includes(currentValue)) {
        filterSelect.value = currentValue;
    } else {
        filterSelect.value = 'all';
    }
    
    if (names.includes(currentValueBalancing)) {
        filterSelectBalancing.value = currentValueBalancing;
    } else {
        filterSelectBalancing.value = 'all';
    }

    if (names.includes(currentValueReview)) {
        filterSelectReview.value = currentValueReview;
    } else {
        filterSelectReview.value = 'all';
    }
}

// IMPORT PROCESSES FROM EXCEL/CSV SPREADSHEET (SHEETJS)
function importExcelFile(file) {
    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            let importCount = 0;
            const importedProcesses = [];
            const newTeams = new Set(state.teams);
            const newResps = new Set((state.responsaveis || []).map(r => r.name));
            
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                
                if (rows.length < 2) return;
                
                const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
                
                let activityIdx = headers.findIndex(h => h.includes('atividade') || h.includes('nome') || h.includes('processo'));
                let teamIdx = headers.findIndex(h => h.includes('equipe') || h.includes('Ã¡rea') || h.includes('area') || h.includes('grupo'));
                let respIdx = headers.findIndex(h => h.includes('responsÃ¡vel') || h.includes('responsavel') || h.includes('dono') || h.includes('colaborador'));
                let volIdx = headers.findIndex(h => h.includes('volume') || h.includes('qtd. mÃªs') || h.includes('qtd. mes') || h.includes('quantidade') || h.includes('qtd. mes'));
                let minIdx = headers.findIndex(h => h.includes('tempo') || h.includes('minutos') || h.includes('duraÃ§Ã£o') || h.includes('duracao'));
                let freqIdx = headers.findIndex(h => h.includes('freq') || h.includes('execuÃ§Ã£o') || h.includes('execucao'));
                
                if (activityIdx === -1) activityIdx = 0;
                if (teamIdx === -1) teamIdx = headers.length > 1 ? 1 : -1;
                if (respIdx === -1) respIdx = headers.length > 2 ? 2 : -1;
                if (volIdx === -1) volIdx = headers.length > 3 ? 3 : -1;
                if (minIdx === -1) minIdx = headers.length > 4 ? 4 : -1;
                if (freqIdx === -1) freqIdx = headers.length > 5 ? 5 : -1;
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    
                    const activityName = activityIdx !== -1 && row[activityIdx] ? String(row[activityIdx]).trim() : '';
                    if (!activityName) continue;
                    
                    const teamName = teamIdx !== -1 && row[teamIdx] ? String(row[teamIdx]).trim() : '';
                    const respName = respIdx !== -1 && row[respIdx] ? String(row[respIdx]).trim() : '';
                    
                    let volumeVal = '';
                    if (volIdx !== -1 && row[volIdx] !== undefined && row[volIdx] !== null && row[volIdx] !== '') {
                        volumeVal = parseFloat(row[volIdx]);
                        if (isNaN(volumeVal)) volumeVal = '';
                    }
                    
                    let minutesVal = 0;
                    if (minIdx !== -1 && row[minIdx] !== undefined && row[minIdx] !== null && row[minIdx] !== '') {
                        minutesVal = parseFloat(row[minIdx]);
                        if (isNaN(minutesVal)) minutesVal = 0;
                    }
                    
                    let freqVal = '';
                    if (freqIdx !== -1 && row[freqIdx] !== undefined && row[freqIdx] !== null && row[freqIdx] !== '') {
                        freqVal = parseFloat(row[freqIdx]);
                        if (isNaN(freqVal)) freqVal = '';
                    }
                    
                    if (teamName && !newTeams.has(teamName)) {
                        newTeams.add(teamName);
                    }
                    if (respName && !newResps.has(respName)) {
                        newResps.add(respName);
                    }
                    
                    importedProcesses.push({
                        id: 'proc-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + importCount,
                        name: activityName,
                        area: teamName || (state.teams.length > 0 ? state.teams[0] : ''),
                        responsavel: respName,
                        volume: volumeVal,
                        minutos: minutesVal,
                        qtdExecucao: freqVal,
                        backlogVolume: '',
                        allocatedResource: '',
                        reviewStatus: 'Manter'
                    });
                    importCount++;
                }
            });
            
            if (importedProcesses.length > 0) {
                const mode = confirm(`ImportaÃ§Ã£o ConcluÃ­da!\n\nForam encontradas ${importCount} atividades.\n\nDeseja SUBSTITUIR as atividades existentes no simulador pelas novas?\n\n(Clique em 'OK' para substituir ou 'Cancelar' para adicionar ao final)`);
                
                state.teams = [...newTeams];
                const existingResps = state.responsaveis || [];
                state.responsaveis = [...newResps].sort().map(name => {
                    const existing = existingResps.find(r => r.name === name);
                    const importedAct = importedProcesses.find(ip => ip.responsavel === name);
                    const importedArea = importedAct ? importedAct.area : '';
                    
                    if (existing) {
                        if (!existing.area) {
                            existing.area = importedArea;
                        }
                        return existing;
                    }
                    return { name, area: importedArea, horasDia: null, absenteismo: null, diasUteis: null };
                });
                
                if (mode) {
                    state.processes = importedProcesses;
                } else {
                    state.processes = [...state.processes, ...importedProcesses];
                }
                
                saveState();
                renderResponsavelFilterOptions();
                renderAreaFilterOptions();
                
                renderCadastrosView();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
                
                alert(`Sucesso! ${importCount} atividades foram importadas e salvas.`);
            } else {
                alert("Nenhuma atividade encontrada na planilha. Verifique se as colunas estÃ£o no formato correto.");
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao ler o arquivo Excel. Certifique-se de que Ã© um arquivo .xlsx, .xls ou .csv vÃ¡lido.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// ----------------------------------------------------
// HISTORY TRACKING & CHART SYSTEM
// ----------------------------------------------------

function formatMonth(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(month, 10) - 1;
    return `${monthsShort[idx]}/${year}`;
}

function initHistoryView() {
    const monthInput = document.getElementById('history-month-input');
    if (monthInput && !monthInput.value) {
        // Default to current month (YYYY-MM)
        monthInput.value = new Date().toISOString().slice(0, 7);
    }
    
    renderSnapshotsList();
    populateHistoryItemOptions();
    renderHistoryChart();
}

function saveHistorySnapshot() {
    if (!verificarPermissao('OPERADOR')) { alert('Acesso negado: Perfil OPERADOR necessÃ¡rio.'); return; }
    const monthInput = document.getElementById('history-month-input');
    if (!monthInput || !monthInput.value) {
        alert("Selecione um mÃªs vÃ¡lido.");
        return;
    }
    
    const selectedMonth = monthInput.value; // YYYY-MM
    
    // Check if current processes are empty
    if (state.processes.length === 0) {
        alert("NÃ£o hÃ¡ atividades cadastradas no Dashboard para salvar.");
        return;
    }
    
    const existingIndex = state.history.findIndex(h => h.month === selectedMonth);
    if (existingIndex !== -1) {
        if (!confirm(`JÃ¡ existe um registro de volume para ${formatMonth(selectedMonth)}. Deseja sobrescrevÃª-lo com os dados atuais do Dashboard?`)) {
            return;
        }
    }
    
    const snapshotData = state.processes.map(p => ({
        name: p.name,
        area: p.area,
        responsavel: p.responsavel || 'Sem ResponsÃ¡vel',
        volume: p.volume !== null && p.volume !== '' ? parseFloat(p.volume) : 0
    }));
    
    const snapshot = {
        month: selectedMonth,
        data: snapshotData
    };
    
    if (existingIndex !== -1) {
        state.history[existingIndex] = snapshot;
    } else {
        state.history.push(snapshot);
    }
    
    // Keep chronologically sorted
    state.history.sort((a, b) => a.month.localeCompare(b.month));
    saveState();
    
    renderSnapshotsList();
    populateHistoryItemOptions();
    renderHistoryChart();
    
    alert(`Registro de demanda para ${formatMonth(selectedMonth)} foi salvo com sucesso!`);
}

function renderSnapshotsList() {
    const container = document.getElementById('history-snapshots-list');
    if (!container) return;
    
    if (!state.history || state.history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                Nenhum registro mensal salvo.
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
    state.history.forEach(h => {
        const totalVolume = h.data.reduce((sum, d) => sum + d.volume, 0);
        html += `
            <div class="glass-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.01);">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${formatMonth(h.month)}</h4>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${h.data.length} atividades â€¢ Vol: ${totalVolume.toFixed(0)}</span>
                </div>
                <button class="btn-row-action btn-delete-snapshot" data-month="${h.month}" title="Excluir Registro" style="color: var(--color-danger); background: transparent; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.2rem;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    // Add delete listeners
    container.querySelectorAll('.btn-delete-snapshot').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessÃ¡rio.'); return; }
            const btnEl = e.currentTarget;
            const month = btnEl.dataset.month;
            if (confirm(`Tem certeza que deseja excluir o registro de ${formatMonth(month)}?`)) {
                state.history = state.history.filter(h => h.month !== month);
                saveState();
                initHistoryView();
            }
        });
    });
}

function populateHistoryItemOptions() {
    const type = document.getElementById('filter-history-type').value;
    const itemsSet = new Set();
    
    // Collect from history data
    if (state.history) {
        state.history.forEach(h => {
            h.data.forEach(d => {
                if (type === 'atividade') itemsSet.add(d.name);
                else if (type === 'area') itemsSet.add(d.area);
                else if (type === 'responsavel') itemsSet.add(d.responsavel);
            });
        });
    }
    
    // Collect from current processes as fallback/addition
    state.processes.forEach(p => {
        if (type === 'atividade') itemsSet.add(p.name);
        else if (type === 'area') itemsSet.add(p.area);
        else if (type === 'responsavel') itemsSet.add(p.responsavel || 'Sem ResponsÃ¡vel');
    });
    
    const items = [...itemsSet].sort();
    const selectItem = document.getElementById('filter-history-item');
    if (!selectItem) return;
    
    if (items.length === 0) {
        selectItem.innerHTML = '<option value="">Nenhum item disponÃ­vel</option>';
        return;
    }
    
    const currentVal = selectItem.value;
    selectItem.innerHTML = items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    
    if (items.includes(currentVal)) {
        selectItem.value = currentVal;
    }
}

function renderHistoryChart() {
    const chartCanvas = document.getElementById('chart-history');
    if (!chartCanvas) return;
    
    const type = document.getElementById('filter-history-type').value;
    const selectedItem = document.getElementById('filter-history-item').value;
    
    // Destroy previous instance
    if (window.historyChartInstance) {
        window.historyChartInstance.destroy();
    }
    
    if (!state.history || state.history.length === 0 || !selectedItem) {
        // Draw empty chart state if no data
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        return;
    }
    
    const labels = state.history.map(h => formatMonth(h.month));
    const dataValues = state.history.map(h => {
        // Aggregate volume for the selected item in this month's data
        let sum = 0;
        h.data.forEach(d => {
            if (type === 'atividade' && d.name === selectedItem) {
                sum += d.volume;
            } else if (type === 'area' && d.area === selectedItem) {
                sum += d.volume;
            } else if (type === 'responsavel' && d.responsavel === selectedItem) {
                sum += d.volume;
            }
        });
        return sum;
    });
    
    const isDark = document.body.classList.contains('dark-theme');
    const style = getComputedStyle(document.body);
    const textColor = style.getPropertyValue('--text-secondary').trim();
    const gridColor = style.getPropertyValue('--border-color').trim();
    const primaryColor = style.getPropertyValue('--color-primary').trim();
    
    const ctx = chartCanvas.getContext('2d');
    
    // Create gradient fill under line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(235, 92, 39, 0.35)');
    gradient.addColorStop(1, 'rgba(235, 92, 39, 0.0)');
    
    window.historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Volume (${selectedItem})`,
                data: dataValues,
                borderColor: primaryColor,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#fff',
                pointHoverRadius: 7,
                pointHoverBackgroundColor: primaryColor,
                pointHoverBorderColor: '#fff',
                pointRadius: 4,
                pointHitRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1e1b18' : '#fff',
                    titleColor: isDark ? '#fff' : '#1e1b18',
                    bodyColor: isDark ? '#fff' : '#1e1b18',
                    borderColor: primaryColor,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, font: { family: 'inherit', size: 11 } }
                },
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, font: { family: 'inherit', size: 11 } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ----------------------------------------------------
// CADASTROS VIEW SYSTEM
// ----------------------------------------------------

function renderCadastrosView() {
    const teamsList = document.getElementById('cadastros-teams-list');
    const responsiblesList = document.getElementById('cadastros-responsibles-list');
    const tableBody = document.getElementById('cadastros-table-body');
    const activityCountBadge = document.getElementById('cadastros-activity-count');
    
    if (!teamsList || !responsiblesList || !tableBody || !activityCountBadge) return;
    
    // Populate new responsible team select options
    const newRespTeamSelect = document.getElementById('select-new-responsible-team');
    if (newRespTeamSelect) {
        newRespTeamSelect.innerHTML = (state.teams || []).map(team => `
            <option value="${escapeHtml(team)}">${escapeHtml(team)}</option>
        `).join('');
    }

    // 1. Render Teams List
    if (!state.teams || state.teams.length === 0) {
        if(teamsList) teamsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Nenhuma equipe cadastrada.</div>';
    } else {
        if(teamsList) {
            teamsList.innerHTML = state.teams.map(team => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);">
                    <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(team)}</span>
                    <button class="btn-delete-team-item" data-permissao="ADMIN" data-team="${escapeHtml(team)}" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.8rem; padding: 0.2rem;" title="Excluir Equipe">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `).join('');
            
            teamsList.querySelectorAll('.btn-delete-team-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                    const team = btn.getAttribute('data-team');
                    if (confirm(`Deseja realmente excluir a equipe "${team}"? Todos os responsáveis e atividades desta equipe ficarão "Sem Equipe".`)) {
                        state.teams = state.teams.filter(t => t !== team);
                        state.processes.forEach(p => {
                            if (p.area === team) p.area = '';
                        });
                        if (state.responsaveis) {
                            state.responsaveis.forEach(r => {
                                if (r.area === team) r.area = '';
                            });
                        }
                        if (state.teamHierarchy) {
                            delete state.teamHierarchy[team];
                        }
                        saveState();
                        renderCadastrosView();
                        renderAreaFilterOptions();
                        renderTable();
                        renderBalancingTable();
                        renderReviewTable();
                    }
                });
            });
        }
    }

    // Helper to toggle accordion
    const toggleAccordion = (headerDiv, contentDiv) => {
        const isHidden = contentDiv.style.display === 'none';
        contentDiv.style.display = isHidden ? 'flex' : 'none';
        const icon = headerDiv.querySelector('i');
        if(icon) {
            icon.className = isHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
        }
    };

    const toggleTableAccordion = (headerTr, className) => {
        const rows = tableBody.querySelectorAll('.' + className);
        let currentlyHidden = true;
        if(rows.length > 0) {
            currentlyHidden = rows[0].style.display === 'none';
        }
        rows.forEach(r => {
            r.style.display = currentlyHidden ? 'table-row' : 'none';
        });
        const icon = headerTr.querySelector('i');
        if(icon) {
            icon.className = currentlyHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
        }
    };

    // 2. Render Responsibles List (Accordion by Team)
    responsiblesList.innerHTML = '';
    if (!state.responsaveis || state.responsaveis.length === 0) {
        responsiblesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Nenhum responsável cadastrado.</div>';
    } else {
        const teamsToRender = [...(state.teams || []), 'Outros / Sem Equipe'];
        
        teamsToRender.forEach(team => {
            let teamResps = [];
            if (team === 'Outros / Sem Equipe') {
                teamResps = state.responsaveis.filter(r => !r.area || !state.teams.includes(r.area));
            } else {
                teamResps = state.responsaveis.filter(r => r.area === team);
            }
            
            if (teamResps.length === 0) return;
            
            // Accordion Header
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; font-weight: 500; font-size: 0.85rem; user-select: none; border: 1px solid rgba(255,255,255,0.02); margin-top: 0.5rem;';
            header.innerHTML = `<i class="fa-solid fa-chevron-right" style="width: 15px; text-align: center;"></i> ${escapeHtml(team)} <span style="background: rgba(255,255,255,0.1); padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.7rem; margin-left: auto;">${teamResps.length}</span>`;
            
            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = 'display: none; flex-direction: column; gap: 0.5rem; padding-left: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;';
            
            header.addEventListener('click', () => toggleAccordion(header, contentContainer));
            
            teamResps.forEach(resp => {
                const container = document.createElement('div');
                container.className = 'resp-item-container';
                container.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);';
                
                const headerRow = document.createElement('div');
                headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: var(--text-primary);';
                
                const hasOverrides = resp.horasDia !== null || resp.absenteismo !== null || resp.diasUteis !== null;
                nameSpan.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(resp.name)}</span>
                    </div>
                    ${hasOverrides ? '<i class="fa-solid fa-user-gear" style="color: var(--color-primary); font-size: 0.75rem; margin-left: 0.25rem;" title="Parâmetros customizados ativos"></i>' : ''}
                `;
                
                const btnGroup = document.createElement('div');
                btnGroup.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
                
                const btnConfig = document.createElement('button');
                btnConfig.className = 'btn-config-resp-item';
                btnConfig.style.cssText = 'background: transparent; border: none; color: var(--color-primary); cursor: pointer; font-size: 0.85rem; padding: 0.2rem; display: flex; align-items: center; justify-content: center;';
                btnConfig.title = 'Configurar Parâmetros de Capacidade';
                btnConfig.innerHTML = '<i class="fa-solid fa-cog"></i>';
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete-resp-item';
                btnDelete.setAttribute('data-permissao', 'ADMIN');
                btnDelete.style.cssText = 'background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.85rem; padding: 0.2rem; display: flex; align-items: center; justify-content: center;';
                btnDelete.title = 'Excluir Responsável';
                btnDelete.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                
                btnGroup.appendChild(btnConfig);
                btnGroup.appendChild(btnDelete);
                headerRow.appendChild(nameSpan);
                headerRow.appendChild(btnGroup);
                container.appendChild(headerRow);
                
                btnConfig.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openCapacityModal(resp.name);
                });
                
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                    if (confirm(`Tem certeza que deseja excluir o responsável "${resp.name}"? Todas as atividades sob sua responsabilidade ficarão sem responsável.`)) {
                        state.responsaveis = state.responsaveis.filter(r => r.name !== resp.name);
                        state.processes.forEach(p => {
                            if (p.responsavel === resp.name) p.responsavel = '';
                        });
                        saveState();
                        renderCadastrosView();
                        renderResponsavelFilterOptions();
                        renderTable();
                        renderBalancingTable();
                        renderReviewTable();
                    }
                });
                
                contentContainer.appendChild(container);
            });
            
            responsiblesList.appendChild(header);
            responsiblesList.appendChild(contentContainer);
        });
    }
    
    // 3. Render Activities Table (Accordion by Team)
    tableBody.innerHTML = '';
    activityCountBadge.textContent = state.processes.length;
    
    if (state.processes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Nenhuma atividade cadastrada. Clique em "Adicionar Atividade" para iniciar.
                </td>
            </tr>
        `;
        const btnBulkDelete = document.getElementById('btn-cadastros-delete-selected');
        if (btnBulkDelete) btnBulkDelete.style.display = 'none';
        const selectAllCb = document.getElementById('cadastros-select-all');
        if (selectAllCb) selectAllCb.checked = false;
        return;
    }
    
    const activityTeamsToRender = [...(state.teams || []), 'Outros / Sem Equipe'];
    
    activityTeamsToRender.forEach((team, teamIndex) => {
        let teamProcs = [];
        if (team === 'Outros / Sem Equipe') {
            teamProcs = state.processes.filter(p => !p.area || !state.teams.includes(p.area));
        } else {
            teamProcs = state.processes.filter(p => p.area === team);
        }
        
        if (teamProcs.length === 0) return;
        
        const rowClass = 'team-activity-row-' + teamIndex;
        
        // Header Row
        const headerTr = document.createElement('tr');
        headerTr.style.cssText = 'background: rgba(255,255,255,0.03); cursor: pointer; user-select: none;';
        headerTr.innerHTML = `
            <td colspan="5" style="padding: 0.8rem; font-weight: 600; color: var(--text-primary); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <i class="fa-solid fa-chevron-right" style="width: 20px;"></i> ${escapeHtml(team)} <span style="background: rgba(255,255,255,0.1); color: var(--text-secondary); padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.75rem; margin-left: 0.5rem;">${teamProcs.length} atividades</span>
            </td>
        `;
        headerTr.addEventListener('click', () => toggleTableAccordion(headerTr, rowClass));
        tableBody.appendChild(headerTr);
        
        // Activity Rows
        teamProcs.forEach(proc => {
            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.style.display = 'none'; // Initially collapsed
            tr.dataset.id = proc.id;
            
            const teamOptions = '<option value="">-- Sem Equipe --</option>' +
                state.teams.map(t => `
                    <option value="${escapeHtml(t)}" ${proc.area === t ? 'selected' : ''}>${escapeHtml(t)}</option>
                `).join('');
                
            const teamResps = (state.responsaveis || []).filter(resp => {
                const rName = typeof resp === 'object' ? resp.name : resp;
                const rArea = typeof resp === 'object' ? resp.area : '';
                return !proc.area || !rArea || rArea === proc.area || proc.responsavel === rName;
            });
            const respsToDisplay = teamResps.length > 0 ? teamResps : (state.responsaveis || []);
            const respOptions = '<option value="">-- Sem Responsável --</option>' +
                respsToDisplay.map(resp => {
                    const rName = typeof resp === 'object' ? resp.name : resp;
                    return `<option value="${escapeHtml(rName)}" ${proc.responsavel === rName ? 'selected' : ''}>${escapeHtml(rName)}</option>`;
                }).join('');
                
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="cadastros-row-checkbox" data-id="${proc.id}">
                </td>
                <td>
                    <input type="text" class="input-activity-name-cell" value="${escapeHtml(proc.name)}" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px;">
                </td>
                <td>
                    <select class="select-activity-team-cell" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer;">
                        ${teamOptions}
                    </select>
                </td>
                <td>
                    <select class="select-activity-resp-cell" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer;">
                        ${respOptions}
                    </select>
                </td>
                <td class="col-excluir-admin" style="text-align: center;">
                    <button class="btn-row-action btn-delete-activity-cell" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.95rem; padding: 0.2rem;" title="Excluir Atividade">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            
            const rowCheckbox = tr.querySelector('.cadastros-row-checkbox');
            rowCheckbox.addEventListener('change', () => {
                updateBulkDeleteState();
            });
            
            const nameInput = tr.querySelector('.input-activity-name-cell');
            nameInput.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                if (val) {
                    proc.name = val;
                    saveState();
                } else {
                    e.target.value = proc.name;
                }
            });
            nameInput.addEventListener('focus', () => {
                nameInput.style.background = 'rgba(255, 255, 255, 0.08)';
                nameInput.style.border = '1px solid var(--border-color)';
            });
            nameInput.addEventListener('blur', () => {
                nameInput.style.background = 'transparent';
                nameInput.style.border = 'none';
            });
            
            const teamSelect = tr.querySelector('.select-activity-team-cell');
            teamSelect.addEventListener('change', (e) => {
                const newTeam = e.target.value;
                proc.area = newTeam;
                proc.responsavel = '';
                saveState();
                
                renderCadastrosView();
                renderAreaFilterOptions();
                renderResponsavelFilterOptions();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
            });
            teamSelect.addEventListener('focus', () => {
                teamSelect.style.background = 'rgba(255, 255, 255, 0.08)';
                teamSelect.style.border = '1px solid var(--border-color)';
            });
            teamSelect.addEventListener('blur', () => {
                teamSelect.style.background = 'transparent';
                teamSelect.style.border = 'none';
            });
            
            const respSelect = tr.querySelector('.select-activity-resp-cell');
            respSelect.addEventListener('change', (e) => {
                proc.responsavel = e.target.value;
                saveState();
                renderResponsavelFilterOptions();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
            });
            respSelect.addEventListener('focus', () => {
                respSelect.style.background = 'rgba(255, 255, 255, 0.08)';
                respSelect.style.border = '1px solid var(--border-color)';
            });
            respSelect.addEventListener('blur', () => {
                respSelect.style.background = 'transparent';
                respSelect.style.border = 'none';
            });
            
            const deleteBtn = tr.querySelector('.btn-delete-activity-cell');
            deleteBtn.addEventListener('click', () => {
                if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                if (confirm(`Deseja realmente excluir a atividade "${proc.name}"?`)) {
                    state.processes = state.processes.filter(p => p.id !== proc.id);
                    saveState();
                    renderCadastrosView();
                    renderTable();
                    renderBalancingTable();
                    renderReviewTable();
                }
            });
            
            tableBody.appendChild(tr);
        });
    });
    
    updateBulkDeleteState();
    
    // Re-apply permission logic after recreating DOM elements
    aplicarPerfilDeAcesso();
}

// Update bulk delete button state helper
function updateBulkDeleteState() {
    const tableBody = document.getElementById('cadastros-table-body');
    if (!tableBody) return;
    
    const checkboxes = tableBody.querySelectorAll('.cadastros-row-checkbox');
    const checked = [...checkboxes].filter(cb => cb.checked);
    const btnDeleteSelected = document.getElementById('btn-cadastros-delete-selected');
    const countSpan = document.getElementById('cadastros-selected-count');
    const selectAllCheckbox = document.getElementById('cadastros-select-all');
    
    if (btnDeleteSelected && countSpan) {
        if (checked.length > 0) {
            btnDeleteSelected.style.display = 'inline-flex';
            countSpan.textContent = checked.length;
        } else {
            btnDeleteSelected.style.display = 'none';
        }
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// Modal Parameters and overrides helper functions
function setupModalParametersListeners() {
    const modal = document.getElementById('modal-parameters');
    if (!modal) return;
    
    const closeBtn = document.getElementById('btn-close-modal-param');
    const saveBtn = document.getElementById('btn-modal-param-save');
    const clearBtn = document.getElementById('btn-modal-param-clear');
    
    const inputHoras = document.getElementById('modal-input-horas-dia');
    const inputAbs = document.getElementById('modal-input-absenteismo');
    const inputDias = document.getElementById('modal-input-dias-uteis');
    
    const valHoras = document.getElementById('modal-val-horas-dia');
    const valAbs = document.getElementById('modal-val-absenteismo');
    const valDias = document.getElementById('modal-val-dias-uteis');
    
    const calcReal = document.getElementById('modal-calc-real-dia');
    const calcMes = document.getElementById('modal-calc-mes');
    
    function updateModalCalculations() {
        const hDia = parseFloat(inputHoras.value);
        const abs = parseFloat(inputAbs.value) / 100;
        const dUteis = parseInt(inputDias.value, 10);
        
        const realDia = hDia * (1 - abs);
        const mesHoras = realDia * dUteis;
        
        valHoras.textContent = hDia.toFixed(1) + 'h';
        valAbs.textContent = Math.round(abs * 100) + '%';
        valDias.textContent = dUteis + 'd';
        
        calcReal.textContent = realDia.toFixed(1) + 'h';
        calcMes.textContent = mesHoras.toFixed(1) + 'h';
    }
    
    [inputHoras, inputAbs, inputDias].forEach(input => {
        if (input) input.addEventListener('input', updateModalCalculations);
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close modal on click outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const respName = document.getElementById('modal-param-target-resp').value;
            if (respName) {
                const resp = state.responsaveis.find(r => r.name === respName);
                if (resp) {
                    resp.horasDia = null;
                    resp.absenteismo = null;
                    resp.diasUteis = null;
                    saveState();
                    updateCalculations();
                    updateBalancingCalculations();
                    renderReviewTable();
                    renderCadastrosView();
                }
            }
            modal.style.display = 'none';
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const respName = document.getElementById('modal-param-target-resp').value;
            const hDia = parseFloat(inputHoras.value);
            const abs = parseFloat(inputAbs.value);
            const dUteis = parseInt(inputDias.value, 10);
            
            if (!respName) {
                // Editing global defaults
                state.params.horasDia = hDia;
                state.params.absenteismo = abs;
                state.params.diasUteis = dUteis;
            } else {
                // Editing responsible overrides
                const resp = state.responsaveis.find(r => r.name === respName);
                if (resp) {
                    resp.horasDia = hDia;
                    resp.absenteismo = abs;
                    resp.diasUteis = dUteis;
                }
            }
            
            saveState();
            updateCalculations();
            updateBalancingCalculations();
            renderReviewTable();
            renderCadastrosView();
            modal.style.display = 'none';
        });
    }
}

function openCapacityModal(respName = '') {
    const modal = document.getElementById('modal-parameters');
    if (!modal) return;
    
    const title = document.getElementById('modal-param-title');
    const clearBtn = document.getElementById('btn-modal-param-clear');
    const targetInput = document.getElementById('modal-param-target-resp');
    
    const inputHoras = document.getElementById('modal-input-horas-dia');
    const inputAbs = document.getElementById('modal-input-absenteismo');
    const inputDias = document.getElementById('modal-input-dias-uteis');
    
    const lblHoras = document.getElementById('modal-lbl-horas-dia-pattern');
    const lblAbs = document.getElementById('modal-lbl-abs-pattern');
    const lblDias = document.getElementById('modal-lbl-dias-pattern');
    
    targetInput.value = respName;
    
    if (!respName) {
        // Global defaults mode
        title.innerHTML = '<i class="fa-solid fa-sliders"></i> ParÃ¢metros PadrÃ£o de Capacidade';
        if (clearBtn) clearBtn.style.display = 'none';
        
        inputHoras.value = state.params.horasDia;
        inputAbs.value = state.params.absenteismo;
        inputDias.value = state.params.diasUteis;
        
        [lblHoras, lblAbs, lblDias].forEach(lbl => {
            if (lbl) lbl.style.display = 'none';
        });
    } else {
        // Responsible overrides mode
        title.innerHTML = `<i class="fa-solid fa-user-tie"></i> Capacidade - ${escapeHtml(respName)}`;
        if (clearBtn) clearBtn.style.display = 'inline-flex';
        
        const resp = state.responsaveis.find(r => r.name === respName);
        if (resp) {
            inputHoras.value = resp.horasDia !== null && resp.horasDia !== undefined ? resp.horasDia : state.params.horasDia;
            inputAbs.value = resp.absenteismo !== null && resp.absenteismo !== undefined ? resp.absenteismo : state.params.absenteismo;
            inputDias.value = resp.diasUteis !== null && resp.diasUteis !== undefined ? resp.diasUteis : state.params.diasUteis;
        }
        
        if (lblHoras) {
            lblHoras.textContent = `PadrÃ£o Global: ${state.params.horasDia.toFixed(1)}h`;
            lblHoras.style.display = 'block';
        }
        if (lblAbs) {
            lblAbs.textContent = `PadrÃ£o Global: ${state.params.absenteismo}%`;
            lblAbs.style.display = 'block';
        }
        if (lblDias) {
            lblDias.textContent = `PadrÃ£o Global: ${state.params.diasUteis}d`;
            lblDias.style.display = 'block';
        }
    }
    
    // Trigger recalculation displays inside modal
    const valHoras = document.getElementById('modal-val-horas-dia');
    const valAbs = document.getElementById('modal-val-absenteismo');
    const valDias = document.getElementById('modal-val-dias-uteis');
    const calcReal = document.getElementById('modal-calc-real-dia');
    const calcMes = document.getElementById('modal-calc-mes');
    
    const hDia = parseFloat(inputHoras.value);
    const abs = parseFloat(inputAbs.value) / 100;
    const dUteis = parseInt(inputDias.value, 10);
    
    const realDia = hDia * (1 - abs);
    const mesHoras = realDia * dUteis;
    
    valHoras.textContent = hDia.toFixed(1) + 'h';
    valAbs.textContent = Math.round(abs * 100) + '%';
    valDias.textContent = dUteis + 'd';
    calcReal.textContent = realDia.toFixed(1) + 'h';
    calcMes.textContent = mesHoras.toFixed(1) + 'h';
    
    modal.style.display = 'flex';
}

// ============================================================
// ACCESS CONTROL VIEW - GESTÃƒO DE PERFIS DE USUÃRIO
// ============================================================

const SETUP_SQL = `-- Execute no SQL Editor do Supabase:

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nome TEXT,
  perfil TEXT DEFAULT 'CONSULTA' CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visÃ­veis para autenticados"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins podem atualizar perfis"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND perfil = 'ADMIN'
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, perfil)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'CONSULTA')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

async function renderAccessControlView() {
    const client = getSupabase();

    const loadingEl = document.getElementById('access-control-loading');
    const wrapperEl = document.getElementById('access-control-table-wrapper');
    const emptyEl   = document.getElementById('access-control-empty');
    const setupInfo = document.getElementById('access-control-setup-info');
    const sqlBlock  = document.getElementById('access-control-sql-block');

    // Reset state
    if (loadingEl) loadingEl.style.display = 'block';
    if (wrapperEl) wrapperEl.style.display = 'none';
    if (emptyEl)   emptyEl.style.display = 'none';
    if (setupInfo) setupInfo.style.display = 'none';

    // Populate SQL block
    if (sqlBlock) sqlBlock.textContent = SETUP_SQL;

    if (!client) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (setupInfo) setupInfo.style.display = 'block';
        return;
    }

    try {
        const { data: profiles, error } = await client
            .from('profiles')
            .select('id, email, nome, perfil, created_at')
            .order('created_at', { ascending: true });

        if (loadingEl) loadingEl.style.display = 'none';

        if (error) {
            // Table likely doesn't exist yet
            if (setupInfo) setupInfo.style.display = 'block';
            return;
        }

        if (!profiles || profiles.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        // Update widgets
        const totalEl    = document.getElementById('widget-access-total');
        const adminEl    = document.getElementById('widget-access-admin');
        const operEl     = document.getElementById('widget-access-operador');
        const consultaEl = document.getElementById('widget-access-consulta');

        if (totalEl)    totalEl.textContent    = profiles.length;
        if (adminEl)    adminEl.textContent    = profiles.filter(p => p.perfil === 'ADMIN').length;
        if (operEl)     operEl.textContent     = profiles.filter(p => p.perfil === 'OPERADOR').length;
        if (consultaEl) consultaEl.textContent = profiles.filter(p => p.perfil === 'CONSULTA').length;

        // Render table
        const tbody = document.getElementById('access-control-table-body');
        if (!tbody) return;

        tbody.innerHTML = profiles.map(profile => {
            const isCurrentUser = profile.id === (window._authUserId || '');
            const date = profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('pt-BR')
                : 'â€“';

            const badgeClass = {
                'ADMIN':    'role-admin',
                'OPERADOR': 'role-operador',
                'CONSULTA': 'role-consulta'
            }[profile.perfil] || 'role-consulta';

            return `
            <tr ${isCurrentUser ? 'style="background: rgba(235,92,39,0.06);"' : ''}>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-circle-user" style="color: var(--color-primary); font-size: 1.1rem;"></i>
                        <span style="font-weight: 500;">${escapeHtml(profile.nome || 'â€“')}</span>
                        ${isCurrentUser ? '<span style="font-size:0.7rem; color: var(--color-primary); background: rgba(235,92,39,0.12); padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.25rem;">VocÃª</span>' : ''}
                    </div>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(profile.email || 'â€“')}</td>
                <td>
                    <select class="access-perfil-select" data-user-id="${profile.id}"
                        style="background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.85rem; cursor: pointer;"
                        onchange="updateUserProfile('${profile.id}', this.value, this)">
                        <option value="ADMIN"    ${profile.perfil === 'ADMIN'    ? 'selected' : ''}>Admin</option>
                        <option value="OPERADOR" ${profile.perfil === 'OPERADOR' ? 'selected' : ''}>Operador</option>
                        <option value="CONSULTA" ${profile.perfil === 'CONSULTA' ? 'selected' : ''}>Consulta</option>
                    </select>
                </td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${date}</td>
            </tr>`;
        }).join('');

        if (wrapperEl) wrapperEl.style.display = 'block';

    } catch (err) {
        console.error('Erro ao buscar perfis:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        if (setupInfo) setupInfo.style.display = 'block';
    }
}

async function updateUserProfile(userId, newPerfil, selectEl) {
    const client = getSupabase();
    if (!client) return;

    const origValue = selectEl ? selectEl.dataset.originalValue || selectEl.value : newPerfil;
    if (selectEl) {
        selectEl.disabled = true;
        selectEl.dataset.originalValue = selectEl.value;
    }

    try {
        const { error } = await client
            .from('profiles')
            .update({ perfil: newPerfil })
            .eq('id', userId);

        if (error) {
            alert('Erro ao atualizar perfil: ' + (error.message || 'Tente novamente.'));
            // Revert
            if (selectEl) selectEl.value = origValue;
        } else {
            // If the updated user is the current user, refresh their session
            if (userId === (window._authUserId || '')) {
                currentUser.perfil = newPerfil;
                aplicarPerfilDeAcesso();
            }
            // Refresh widgets
            renderAccessControlView();
        }
    } catch (err) {
        alert('Erro inesperado: ' + err.message);
        if (selectEl) selectEl.value = origValue;
    } finally {
        if (selectEl) selectEl.disabled = false;
    }
}

