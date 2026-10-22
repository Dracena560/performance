import test from 'node:test';
import assert from 'node:assert/strict';
process.env.HEALTH_GPT_ACTION_KEY='test-key';
const { issueAccessToken, readAccessToken, readRefreshToken, isTrustedCallback } = await import('../lib/mcp-oauth');

test('tokens last long and the refresh token renews access',()=>{
 const token=issueAccessToken('user');
 assert.ok(token.expiresIn>=60*60*24*30);
 assert.equal(readAccessToken(token.accessToken)?.sub,'user');
 assert.equal(readRefreshToken(token.refreshToken)?.sub,'user');
 assert.equal(readRefreshToken(token.accessToken),null);
 assert.equal(readAccessToken(token.refreshToken),null);
});

test('only chat app callbacks skip consent',()=>{
 assert.ok(isTrustedCallback('https://claude.ai/api/mcp/auth_callback'));
 assert.ok(isTrustedCallback('https://chatgpt.com/connector_platform_oauth_redirect'));
 assert.ok(!isTrustedCallback('https://claude.ai.evil.com/cb'));
 assert.ok(!isTrustedCallback('http://claude.ai/cb'));
});
