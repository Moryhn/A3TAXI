// The text actually texted to the customer for a quick-message button.
// {lien} marks where the button's link goes; if the message doesn't use it, a
// configured link is still sent (added at the end) unless the admin already
// typed that link into the text — a filled-in link field that silently never
// gets sent is the trap this avoids. Mirrors composeMessage in
// backend/src/routes/quickMessages.js so previews match what is really sent.
export function composeQuickMessage(button) {
    const template = button.message_template || '';
    const link = (button.google_review_link || '').trim();
    if (template.includes('{lien}')) return template.replaceAll('{lien}', link);
    if (link && !template.includes(link)) return `${template}\n\n${link}`;
    return template;
}
