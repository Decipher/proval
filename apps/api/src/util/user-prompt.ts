export function generateUserPrompt(header: string, body: string | null) {
    const trimmedBody = body?.trim();
    if (!trimmedBody) {
        return null;
    }
    return `${header}\n\n${trimmedBody}`;
}
