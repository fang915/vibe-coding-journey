/**
 * 寻味 Xunwei · 健康检查云函数
 * 访问路径：GET /api/health
 *
 * 用途：确认「云函数 + HTTP 路由」这条链路是否通了。
 * 刻意的约束：不连数据库、不写业务逻辑、不依赖任何第三方包。
 * 因此它挂了，只可能是部署或路由的问题，不可能是数据的问题。
 *
 * 关于返回值：CloudBase 的 HTTP 网关支持「集成响应」——
 * 只要返回值里带上 statusCode / headers / body 三个字段，
 * 网关就按这个结构原样拼成 HTTP 响应，body 字符串就是浏览器看到的响应体。
 * （所以 body 必须是 JSON.stringify 出来的字符串，不能直接塞对象。）
 */
exports.main = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 健康检查不看缓存，每次都拿实时结果
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      ok: true,
      service: 'xunwei'
    })
  };
};
