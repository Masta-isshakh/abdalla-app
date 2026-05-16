const MANUAL_ADMIN_EMAILS = new Set(['owner@jahzeen.app', 'admin@jahzeen.app']);
export const handler = async (event) => {
    const email = event.request.userAttributes?.email?.trim().toLowerCase() ?? '';
    if (MANUAL_ADMIN_EMAILS.has(email)) {
        throw new Error('Admin accounts are created manually by platform operators.');
    }
    return event;
};
