/* =========================================
   VELORA SPORTS - EXTENSÕES AVANÇADAS v2.0
   BI de Cupons, Embaixadores, OAuth2 Strava
========================================= */

/* =========================================
   1. BUSINESS INTELLIGENCE DE CUPONS
========================================= */

/**
 * Registra uso de cupom para BI
 * @param {string} couponCode - Código do cupom
 * @param {number} discountAmount - Valor do desconto em R$
 * @param {string} eventId - ID do evento (se aplicável)
 * @param {string} userId - ID do usuário
 */
function recordCouponUsage(couponCode, discountAmount, eventId, userId) {
    const usageLog = JSON.parse(localStorage.getItem('velora_coupon_usage_log')) || [];
    
    usageLog.push({
        couponCode,
        discountAmount,
        eventId,
        userId,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('pt-BR')
    });
    
    localStorage.setItem('velora_coupon_usage_log', JSON.stringify(usageLog));
}

/**
 * Gera relatório de cupons para BI
 * @returns {Object} Relatório com cupons mais usados e margem queimada
 */
function generateCouponBIReport() {
    const usageLog = JSON.parse(localStorage.getItem('velora_coupon_usage_log')) || [];
    const couponStats = {};
    let totalDiscountAmount = 0;
    
    usageLog.forEach(usage => {
        if (!couponStats[usage.couponCode]) {
            couponStats[usage.couponCode] = {
                code: usage.couponCode,
                usageCount: 0,
                totalDiscount: 0,
                events: new Set()
            };
        }
        couponStats[usage.couponCode].usageCount++;
        couponStats[usage.couponCode].totalDiscount += usage.discountAmount;
        couponStats[usage.couponCode].events.add(usage.eventId);
        totalDiscountAmount += usage.discountAmount;
    });
    
    // Converter Set para Array
    Object.keys(couponStats).forEach(key => {
        couponStats[key].events = Array.from(couponStats[key].events);
    });
    
    return {
        totalCouponsUsed: usageLog.length,
        totalDiscountAmount: totalDiscountAmount.toFixed(2),
        couponStats: couponStats,
        generatedAt: new Date().toLocaleString('pt-BR')
    };
}

/**
 * Retorna cupons mais "queimadores" de margem
 * @param {number} limit - Número de cupons a retornar
 * @returns {Array} Array com cupons ordenados por desconto total
 */
function getTopCouponsByDiscount(limit = 10) {
    const report = generateCouponBIReport();
    const sorted = Object.values(report.couponStats)
        .sort((a, b) => b.totalDiscount - a.totalDiscount)
        .slice(0, limit);
    
    return sorted;
}

/* =========================================
   2. PROGRAMA DE EMBAIXADORES
========================================= */

/**
 * Define o nível de lealdade do usuário
 * @param {string} userId - ID do usuário
 * @param {number} eventsCompleted - Número de eventos completados
 * @returns {string} Nível: 'Bronze', 'Prata', 'Ouro', 'Embaixador'
 */
function calculateLoyaltyLevel(eventsCompleted) {
    if (eventsCompleted >= 100) return 'Embaixador';
    if (eventsCompleted >= 50) return 'Ouro';
    if (eventsCompleted >= 20) return 'Prata';
    return 'Bronze';
}

/**
 * Retorna benefícios do nível de lealdade
 * @param {string} level - Nível de lealdade
 * @returns {Object} Benefícios do nível
 */
function getLoyaltyBenefits(level) {
    const benefits = {
        'Bronze': {
            couponDiscount: 5,
            cashbackPercent: 0,
            earlyAccess: false,
            ambassadorCommission: 0
        },
        'Prata': {
            couponDiscount: 10,
            cashbackPercent: 2,
            earlyAccess: false,
            ambassadorCommission: 0
        },
        'Ouro': {
            couponDiscount: 15,
            cashbackPercent: 5,
            earlyAccess: true,
            ambassadorCommission: 0
        },
        'Embaixador': {
            couponDiscount: 20,
            cashbackPercent: 10,
            earlyAccess: true,
            ambassadorCommission: 10 // 10% de comissão em V$
        }
    };
    
    return benefits[level] || benefits['Bronze'];
}

/**
 * Registra uso de cupom pessoal de embaixador
 * @param {string} ambassadorId - ID do embaixador
 * @param {number} commissionAmount - Valor da comissão em V$
 */
function recordAmbassadorCommission(ambassadorId, commissionAmount) {
    const commissionLog = JSON.parse(localStorage.getItem('velora_ambassador_commissions')) || [];
    
    commissionLog.push({
        ambassadorId,
        commissionAmount,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('pt-BR')
    });
    
    localStorage.setItem('velora_ambassador_commissions', JSON.stringify(commissionLog));
}

/**
 * Retorna total de comissões ganhas por um embaixador
 * @param {string} ambassadorId - ID do embaixador
 * @returns {number} Total de comissões em V$
 */
function getAmbassadorTotalCommission(ambassadorId) {
    const commissionLog = JSON.parse(localStorage.getItem('velora_ambassador_commissions')) || [];
    
    return commissionLog
        .filter(c => c.ambassadorId === ambassadorId)
        .reduce((total, c) => total + c.commissionAmount, 0)
        .toFixed(2);
}

/* =========================================
   3. CONFIGURAÇÃO SEGURA DE OAUTH2 STRAVA
========================================= */

// Credenciais do Strava (PROTEGIDAS - Nunca expor no GitHub público)
// Em produção, usar variáveis de ambiente do servidor
const STRAVA_CONFIG = {
    CLIENT_ID: '207869',
    CLIENT_SECRET: 'd3bedfce8045759c3fc31f75636fd1c46b4c1913', // NUNCA expor em código público!
    REDIRECT_URI: 'https://mpdoval.github.io/veloraspt/conectar_strava.html', // Ajustar conforme deploy
    AUTH_URL: 'https://www.strava.com/oauth/authorize',
    TOKEN_URL: 'https://www.strava.com/api/v3/oauth/token',
    API_BASE: 'https://www.strava.com/api/v3'
};

/**
 * Gera URL de autorização OAuth2 do Strava
 * @returns {string} URL para redirecionar o usuário
 */
function generateStravaAuthURL() {
    const params = new URLSearchParams({
        client_id: STRAVA_CONFIG.CLIENT_ID,
        redirect_uri: STRAVA_CONFIG.REDIRECT_URI,
        response_type: 'code',
        scope: 'activity:read_all',
        state: generateRandomState()
    });
    
    return `${STRAVA_CONFIG.AUTH_URL}?${params.toString()}`;
}

/**
 * Gera um state aleatório para segurança CSRF
 * @returns {string} State aleatório
 */
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Processa o callback do Strava (executar em conectar_strava.html)
 * @param {string} code - Código de autorização do Strava
 * @returns {Promise} Promise com o token de acesso
 */
async function exchangeStravaCode(code) {
    try {
        const response = await fetch(STRAVA_CONFIG.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: STRAVA_CONFIG.CLIENT_ID,
                client_secret: STRAVA_CONFIG.CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('velora_strava_access_token', data.access_token);
            localStorage.setItem('velora_strava_athlete_id', data.athlete.id);
            localStorage.setItem('velora_strava_connected', 'true');
            
            return { success: true, athleteId: data.athlete.id };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        console.error('Erro ao trocar código Strava:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca atividades do Strava do usuário
 * @param {number} limit - Número de atividades a buscar
 * @returns {Promise} Array de atividades
 */
async function fetchStravaActivities(limit = 30) {
    const accessToken = localStorage.getItem('velora_strava_access_token');
    
    if (!accessToken) {
        return { success: false, error: 'Strava não conectado' };
    }
    
    try {
        const response = await fetch(`${STRAVA_CONFIG.API_BASE}/athlete/activities?per_page=${limit}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const activities = await response.json();
        return { success: true, activities: activities };
    } catch (error) {
        console.error('Erro ao buscar atividades Strava:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Processa atividades do Strava com validação completa
 * @param {Array} activities - Array de atividades do Strava
 * @param {Object} challenge - Objeto do desafio
 * @returns {Object} Resultado do processamento
 */
async function processStravaActivitiesForChallenge(activities, challenge) {
    let totalDistance = 0;
    let validActivities = [];
    let invalidActivities = [];
    
    activities.forEach(activity => {
        // Validar modalidade
        const typeValidation = validateActivityType(activity.type, challenge.type);
        if (!typeValidation.valid) {
            invalidActivities.push({
                activity: activity.name,
                reason: typeValidation.message
            });
            return;
        }
        
        // Validar velocidade
        const paceValidation = validateActivityPace(activity.distance / 1000, activity.moving_time, activity.type);
        if (!paceValidation.valid) {
            invalidActivities.push({
                activity: activity.name,
                reason: paceValidation.message,
                flaggedForReview: true
            });
            return;
        }
        
        // Validar data
        const actDate = new Date(activity.start_date);
        const startDate = new Date(challenge.start_date);
        const endDate = new Date(challenge.end_date);
        
        if (actDate < startDate || actDate > endDate) {
            invalidActivities.push({
                activity: activity.name,
                reason: 'Atividade fora do período do desafio'
            });
            return;
        }
        
        // Atividade válida!
        totalDistance += activity.distance / 1000;
        validActivities.push({
            name: activity.name,
            distance: (activity.distance / 1000).toFixed(2),
            pace: paceValidation.pace,
            date: actDate.toLocaleDateString('pt-BR')
        });
    });
    
    return {
        totalDistance: totalDistance.toFixed(2),
        validActivities: validActivities,
        invalidActivities: invalidActivities,
        progressPercent: ((totalDistance / challenge.targetDistance) * 100).toFixed(2)
    };
}

/**
 * Desconecta o Strava
 */
function disconnectStrava() {
    localStorage.removeItem('velora_strava_access_token');
    localStorage.removeItem('velora_strava_athlete_id');
    localStorage.removeItem('velora_strava_connected');
}

/* =========================================
   4. EXPORTAÇÕES AVANÇADAS
========================================= */

window.VeloraAdvanced = {
    // BI de Cupons
    recordCouponUsage,
    generateCouponBIReport,
    getTopCouponsByDiscount,
    
    // Embaixadores
    calculateLoyaltyLevel,
    getLoyaltyBenefits,
    recordAmbassadorCommission,
    getAmbassadorTotalCommission,
    
    // OAuth2 Strava
    generateStravaAuthURL,
    exchangeStravaCode,
    fetchStravaActivities,
    processStravaActivitiesForChallenge,
    disconnectStrava,
    STRAVA_CONFIG
};
