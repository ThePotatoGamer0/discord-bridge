// Discord's random join message templates (from Server Settings > Onboarding)
// https://gist.githubusercontent.com/macdja38/12dff2a6a496cd2d9185fec43c01d77b
const JOIN_TEMPLATES = [
  '[!!{username}!!](usernameOnClick) just joined the server - glhf!',
  '[!!{username}!!](usernameOnClick) just joined. Everyone, look busy!',
  '[!!{username}!!](usernameOnClick) just joined. Can I get a heal?',
  '[!!{username}!!](usernameOnClick) joined your party.',
  '[!!{username}!!](usernameOnClick) joined. You must construct additional pylons.',
  'Ermagherd. [!!{username}!!](usernameOnClick) is here.',
  'Welcome, [!!{username}!!](usernameOnClick). Stay awhile and listen.',
  'Welcome, [!!{username}!!](usernameOnClick). We were expecting you ( ͡° ͜ʖ ͡°)',
  'Welcome, [!!{username}!!](usernameOnClick). We hope you brought pizza.',
  'Welcome [!!{username}!!](usernameOnClick). Leave your weapons by the door.',
  'A wild [!!{username}!!](usernameOnClick) appeared.',
  'Swoooosh. [!!{username}!!](usernameOnClick) just landed.',
  'Brace yourselves. [!!{username}!!](usernameOnClick) just joined the server.',
  '[!!{username}!!](usernameOnClick) just joined. Hide your bananas.',
  '[!!{username}!!](usernameOnClick) just arrived. Seems OP - please nerf.',
  '[!!{username}!!](usernameOnClick) just slid into the server.',
  'A [!!{username}!!](usernameOnClick) has spawned in the server.',
  'Big [!!{username}!!](usernameOnClick) showed up!',
  "Where's [!!{username}!!](usernameOnClick)? In the server!",
  '[!!{username}!!](usernameOnClick) hopped into the server. Kangaroo!!',
  '[!!{username}!!](usernameOnClick) just showed up. Hold my beer.',
];

function formatJoinMessage(displayName, messageId = null) {
  const idx = messageId
    ? (parseInt(messageId.slice(-8), 16) % JOIN_TEMPLATES.length)
    : Math.floor(Math.random() * JOIN_TEMPLATES.length);
  const template = JOIN_TEMPLATES[idx];
  return template.replace(/\[!!\{username\}!!\]\(usernameOnClick\)/g, displayName);
}

module.exports = { formatJoinMessage, JOIN_TEMPLATES };
