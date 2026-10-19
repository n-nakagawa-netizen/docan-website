// noteの最新記事を取得して返す（Vercel Serverless Function）
//
// もともとは api.rss2json.com という外部の無料サービスを経由していたが、
// そこが停止するとサイトのNEWS欄が消えるため、自前で取得する形にした。
// レスポンスの形は rss2json と同じにしてあるので、フロント側の処理は変えていない。

const FEED_URL = 'https://note.com/docan_inc/rss';
const MAX_ITEMS = 6;

function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function attr(block, tag, name) {
  const m = block.match(new RegExp('<' + tag + '[^>]*\\s' + name + '="([^"]*)"'));
  return m ? m[1] : '';
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseFeed(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.slice(0, MAX_ITEMS).map(function (b) {
    return {
      title: decode(pick(b, 'title')),
      link: pick(b, 'link'),
      pubDate: pick(b, 'pubDate'),
      thumbnail: attr(b, 'media:thumbnail', 'url')
    };
  }).filter(function (x) { return x.title && x.link; });
}

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'docaninc-website/1.0 (+https://www.docaninc.com/)' }
    });
    if (!r.ok) throw new Error('feed responded ' + r.status);

    const items = parseFeed(await r.text());
    if (items.length === 0) throw new Error('no items');

    // 30分はCDNのキャッシュを使い、その後の1日は古い内容を返しつつ裏で更新する
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json({ status: 'ok', items: items });
  } catch (e) {
    // 失敗してもフロント側のフォールバック表示に任せる（500にはしない）
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ status: 'error', message: String((e && e.message) || e), items: [] });
  }
};

module.exports.parseFeed = parseFeed;
