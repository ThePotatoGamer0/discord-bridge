// Shared emoji data for picker and inline suggestions.
// Unicode emoji names match Discord/Twitter shortcodes.

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      { char: '😀', name: 'grinning' },
      { char: '😃', name: 'smiley' },
      { char: '😄', name: 'smile', aliases: ['happy'] },
      { char: '😁', name: 'grin', aliases: ['happy'] },
      { char: '😆', name: 'laughing', aliases: ['happy'] },
      { char: '😅', name: 'sweat_smile' },
      { char: '🤣', name: 'rofl' },
      { char: '😂', name: 'joy' },
      { char: '🙂', name: 'slightly_smiling_face' },
      { char: '🙃', name: 'upside_down_face' },
      { char: '😉', name: 'wink' },
      { char: '😊', name: 'blush' },
      { char: '😇', name: 'innocent' },
      { char: '🥰', name: 'smiling_face_with_hearts' },
      { char: '😍', name: 'heart_eyes' },
      { char: '🤩', name: 'star_struck' },
      { char: '😘', name: 'kissing_heart' },
      { char: '😗', name: 'kissing' },
      { char: '😚', name: 'kissing_closed_eyes' },
      { char: '😙', name: 'kissing_smiling_eyes' },
      { char: '🥲', name: 'smiling_face_with_tear' },
      { char: '😋', name: 'yum' },
      { char: '😛', name: 'stuck_out_tongue' },
      { char: '😜', name: 'stuck_out_tongue_winking_eye' },
      { char: '🤪', name: 'zany_face' },
      { char: '😝', name: 'stuck_out_tongue_closed_eyes' },
      { char: '🤑', name: 'money_mouth_face' },
      { char: '🤗', name: 'hugs' },
      { char: '🤭', name: 'hand_over_mouth' },
      { char: '🤫', name: 'shushing_face' },
      { char: '🤔', name: 'thinking' },
      { char: '🤐', name: 'zipper_mouth_face' },
      { char: '🤨', name: 'raised_eyebrow' },
      { char: '😐', name: 'neutral_face' },
      { char: '😑', name: 'expressionless' },
      { char: '😶', name: 'no_mouth' },
      { char: '😏', name: 'smirk' },
      { char: '😒', name: 'unamused' },
      { char: '🙄', name: 'roll_eyes' },
      { char: '😬', name: 'grimacing' },
      { char: '🤥', name: 'lying_face' },
      { char: '😌', name: 'relieved' },
      { char: '😔', name: 'pensive' },
      { char: '😪', name: 'sleepy' },
      { char: '🤤', name: 'drooling_face' },
      { char: '😴', name: 'sleeping' },
      { char: '😷', name: 'mask' },
      { char: '🤒', name: 'face_with_thermometer' },
      { char: '🤕', name: 'face_with_head_bandage' },
      { char: '🤢', name: 'nauseated_face' },
      { char: '🤮', name: 'sneezing_face' },
      { char: '🤧', name: 'sneezing' },
      { char: '🥵', name: 'hot_face' },
      { char: '🥶', name: 'cold_face' },
      { char: '🥴', name: 'woozy_face' },
      { char: '😵', name: 'dizzy_face' },
      { char: '🤯', name: 'exploding_head' },
      { char: '🤠', name: 'cowboy_hat_face' },
      { char: '🥳', name: 'partying_face' },
      { char: '🥸', name: 'disguised_face' },
      { char: '😎', name: 'sunglasses' },
      { char: '🤓', name: 'nerd_face' },
      { char: '🧐', name: 'monocle_face' },
      { char: '😕', name: 'confused' },
      { char: '😟', name: 'worried' },
      { char: '🙁', name: 'slightly_frowning_face' },
      { char: '☹️', name: 'frowning_face' },
      { char: '😮', name: 'open_mouth' },
      { char: '😯', name: 'hushed' },
      { char: '😲', name: 'astonished' },
      { char: '😳', name: 'flushed' },
      { char: '🥺', name: 'pleading_face' },
      { char: '😦', name: 'frowning' },
      { char: '😧', name: 'anguished' },
      { char: '😨', name: 'fearful' },
      { char: '😰', name: 'cold_sweat' },
      { char: '😥', name: 'disappointed_relieved' },
      { char: '😢', name: 'cry' },
      { char: '😭', name: 'sob' },
      { char: '😱', name: 'scream' },
      { char: '😖', name: 'confounded' },
      { char: '😣', name: 'persevere' },
      { char: '😞', name: 'disappointed' },
      { char: '😓', name: 'sweat' },
      { char: '😩', name: 'weary' },
      { char: '😫', name: 'tired_face' },
      { char: '🥱', name: 'yawning_face' },
      { char: '😤', name: 'triumph' },
      { char: '😡', name: 'rage' },
      { char: '😠', name: 'angry' },
      { char: '🤬', name: 'cursing_face' },
      { char: '😈', name: 'smiling_imp' },
      { char: '👿', name: 'imp' },
      { char: '💀', name: 'skull' },
      { char: '☠️', name: 'skull_crossbones' },
      { char: '💩', name: 'poop' },
      { char: '🤡', name: 'clown_face' },
      { char: '👹', name: 'japanese_ogre' },
      { char: '👺', name: 'japanese_goblin' },
      { char: '👻', name: 'ghost' },
      { char: '👽', name: 'alien' },
      { char: '👾', name: 'space_invader' },
      { char: '🤖', name: 'robot' },
    ]
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: [
      { char: '👋', name: 'wave' },
      { char: '🤚', name: 'raised_back_of_hand' },
      { char: '🖐️', name: 'hand_splayed' },
      { char: '✋', name: 'raised_hand' },
      { char: '🖖', name: 'vulcan_salute' },
      { char: '👌', name: 'ok_hand' },
      { char: '🤌', name: 'pinched_fingers' },
      { char: '🤏', name: 'pinching_hand' },
      { char: '✌️', name: 'v' },
      { char: '🤞', name: 'crossed_fingers' },
      { char: '🤟', name: 'love_you_gesture' },
      { char: '🤘', name: 'metal' },
      { char: '🤙', name: 'call_me_hand' },
      { char: '👈', name: 'point_left' },
      { char: '👉', name: 'point_right' },
      { char: '👆', name: 'point_up_2' },
      { char: '🖕', name: 'middle_finger' },
      { char: '👇', name: 'point_down' },
      { char: '☝️', name: 'point_up' },
      { char: '👍', name: 'thumbsup' },
      { char: '👎', name: 'thumbsdown' },
      { char: '✊', name: 'fist' },
      { char: '👊', name: 'facepunch' },
      { char: '🤛', name: 'left_facing_fist' },
      { char: '🤜', name: 'right_facing_fist' },
      { char: '👏', name: 'clap' },
      { char: '🙌', name: 'raised_hands' },
      { char: '👐', name: 'open_hands' },
      { char: '🤲', name: 'palms_up_together' },
      { char: '🙏', name: 'pray' },
    ]
  },
  {
    name: 'Hearts',
    icon: '❤️',
    emojis: [
      { char: '❤️', name: 'heart' },
      { char: '🧡', name: 'orange_heart' },
      { char: '💛', name: 'yellow_heart' },
      { char: '💚', name: 'green_heart' },
      { char: '💙', name: 'blue_heart' },
      { char: '💜', name: 'purple_heart' },
      { char: '🖤', name: 'black_heart' },
      { char: '🤍', name: 'white_heart' },
      { char: '🤎', name: 'brown_heart' },
      { char: '💔', name: 'broken_heart' },
      { char: '❤️‍🔥', name: 'heart_on_fire' },
      { char: '💕', name: 'two_hearts' },
      { char: '💞', name: 'revolving_hearts' },
      { char: '💓', name: 'heartbeat' },
    ]
  },
  {
    name: 'Animals',
    icon: '🐶',
    emojis: [
      { char: '🐶', name: 'dog' },
      { char: '🐱', name: 'cat' },
      { char: '🐭', name: 'mouse' },
      { char: '🐹', name: 'hamster' },
      { char: '🐰', name: 'rabbit' },
      { char: '🦊', name: 'fox_face' },
      { char: '🐻', name: 'bear' },
      { char: '🐼', name: 'panda_face' },
      { char: '🐨', name: 'koala' },
      { char: '🐯', name: 'tiger' },
      { char: '🦁', name: 'lion' },
      { char: '🐮', name: 'cow' },
      { char: '🐷', name: 'pig' },
      { char: '🐸', name: 'frog' },
      { char: '🐵', name: 'monkey_face' },
      { char: '🐔', name: 'chicken' },
      { char: '🐧', name: 'penguin' },
      { char: '🦆', name: 'duck' },
    ]
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: [
      { char: '🍕', name: 'pizza' },
      { char: '🍔', name: 'hamburger' },
      { char: '🍟', name: 'fries' },
      { char: '🌭', name: 'hotdog' },
      { char: '🍿', name: 'popcorn' },
      { char: '🥓', name: 'bacon' },
      { char: '🥚', name: 'egg' },
      { char: '🍞', name: 'bread' },
      { char: '🥐', name: 'croissant' },
      { char: '🧀', name: 'cheese' },
      { char: '🍣', name: 'sushi' },
      { char: '🍩', name: 'doughnut' },
      { char: '🍪', name: 'cookie' },
      { char: '🎂', name: 'birthday' },
      { char: '🍰', name: 'cake' },
      { char: '🍫', name: 'chocolate_bar' },
      { char: '☕', name: 'coffee' },
      { char: '🍺', name: 'beer' },
      { char: '🍷', name: 'wine_glass' },
    ]
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      { char: '⚽', name: 'soccer' },
      { char: '🏀', name: 'basketball' },
      { char: '🏈', name: 'football' },
      { char: '⚾', name: 'baseball' },
      { char: '🎾', name: 'tennis' },
      { char: '🏐', name: 'volleyball' },
      { char: '🎮', name: 'video_game' },
      { char: '🎯', name: 'dart' },
      { char: '🎲', name: 'game_die' },
    ]
  },
  {
    name: 'Symbols',
    icon: '✅',
    emojis: [
      { char: '✅', name: 'white_check_mark' },
      { char: '❌', name: 'x' },
      { char: '❗', name: 'exclamation' },
      { char: '❓', name: 'question' },
      { char: '💯', name: '100' },
      { char: '🔥', name: 'fire' },
      { char: '✨', name: 'sparkles' },
      { char: '⭐', name: 'star' },
      { char: '❤️', name: 'heart' },
    ]
  },
];

const ALL_UNICODE_EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.emojis);

/** Lowercase shortcode -> Unicode char for :shortcode: replacement in messages. */
export const SHORTCODE_TO_CHAR = (() => {
  const map = {};
  for (const emoji of ALL_UNICODE_EMOJIS) {
    map[emoji.name.toLowerCase()] = emoji.char;
    for (const alias of emoji.aliases || []) {
      map[alias.toLowerCase()] = emoji.char;
    }
  }
  return map;
})();

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg';

/** Normalize emoji for Twemoji CDN: strip U+FE0F (variation selector) when no ZWJ present. */
function toTwemojiCodepoint(char) {
  if (!char) return '';
  const hasZWJ = char.includes('\u200D');
  const normalized = hasZWJ ? char : char.replace(/\uFE0F/g, '');
  return [...normalized].map(c => c.codePointAt(0).toString(16)).join('-');
}

export function twemojiUrl(char) {
  if (!char) return null;
  const cp = toTwemojiCodepoint(char);
  return cp ? `${TWEMOJI_BASE}/${cp}.svg` : null;
}

function emojiMatchesQuery(emoji, q) {
  if (!q) return true;
  const name = (emoji.name || '').toLowerCase();
  const aliases = (emoji.aliases || []).join(' ').toLowerCase();
  return name.includes(q) || aliases.includes(q);
}

/** Returns combined list: custom emojis first (Discord-style), then unicode. Limit ~25 total. */
export function filterEmojiCandidates(unicodeEmojis, customEmojis, query) {
  const q = (query || '').toLowerCase().trim();
  const custom = !q
    ? customEmojis.slice(0, 10)
    : customEmojis.filter(e => emojiMatchesQuery(e, q)).slice(0, 10);
  const unicode = !q
    ? unicodeEmojis.slice(0, 15)
    : unicodeEmojis.filter(e => emojiMatchesQuery(e, q)).slice(0, 15);
  return [...custom, ...unicode];
}

export { EMOJI_CATEGORIES, ALL_UNICODE_EMOJIS };
