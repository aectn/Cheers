/* ==========================================================================
   奇思科创社 官网 — 站点级配置
   ⚠️ 换域名、换群号、上真图，基本只需要改这个文件
   ========================================================================== */

window.SITE_CONFIG = {
  /* ---- 域名（改成你自己的，不带 https://，用于 SEO / OG 标签） ---- */
  domain: "cheers.aectn.top",

  /* ---- 社团基本信息 ---- */
  clubName: "奇思科创社",
  school: "揭阳一中",
  founded: "2019年1月",

  /* ---- 招新联系方式 ---- */
  qqGroup: "等待填写",          // 新生咨询 QQ 群号
  qqGroupKey: "",              // 群链接 key，形如 5f3a2b1c...（群号给不出去就留空）
  qqContact: "等待填写",        // 官号 / 负责人 QQ

  /* ---- 二维码图片（把图放到 assets/img/ 下，文件名填这里；留空则显示占位框） ---- */
  qrGroup: "",                 // 例如："assets/img/qr-group.png"
  qrContact: "",               // 例如："assets/img/qr-official.png"

  /* ---- 外链 ---- */
  bilibili: "",
  wechatMP: "",

  /* ---- Cloudflare Web Analytics / 其他统计的 token（没有就留空） ---- */
  analyticsToken: ""
};
