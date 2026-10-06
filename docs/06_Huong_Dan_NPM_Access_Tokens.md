# 🔑 Tài Liệu Chuẩn: Hướng Dẫn Về NPM Access Tokens

> **Nguồn chính thức**: [https://docs.npmjs.com/about-access-tokens](https://docs.npmjs.com/about-access-tokens)  
> **Lưu trữ nội bộ**: Thư mục `docs/06_Huong_Dan_NPM_Access_Tokens.md`  
> **Cập nhật**: Tháng 10/2026

---

## 📌 Tóm Tắt Nhanh (Executive Summary)

1. **Access Token là gì?**
   - Access token là phương thức xác thực thay thế cho username/password khi dùng npm CLI hoặc API.
   - Định dạng: Chuỗi hex (ví dụ tiền tố `npm_...`). Dùng để cài đặt (install) hoặc phát hành (publish) các module/package, đặc biệt trong CI/CD (GitHub Actions, Cloudflare Workers).

2. **Yêu cầu & Quy định mới nhất:**
   - **Chỉ hỗ trợ Granular Access Tokens**: Kể từ tháng 11/2025, toàn bộ Legacy tokens đã bị khai tử.
   - **Giới hạn Granular Token**: Mỗi tài khoản tối đa 1.000 tokens; mỗi token tối đa 50 organizations và 50 packages/scopes.
   - **Bypass 2FA**: Áp dụng cho token có quyền ghi (write). Mặc định là `false`. Nếu bật `true`, token sẽ vượt qua yêu cầu 2FA của tài khoản khi publish tự động.
   - **Stage-Only Tokens (Bảo mật CI/CD)**: Không cho publish trực tiếp lên registry mà tạo bản nháp kiểm duyệt (`npm stage publish`), yêu cầu maintainer có 2FA duyệt (`npm stage approve <stage-id> --otp <code>`).
   - **Lộ trình xóa bỏ Direct Publishing**: Token bypass 2FA phát hành trực tiếp sẽ bị xóa hoàn toàn vào **Tháng 1/2027**.
   - **Kể từ Tháng 8/2026**: Các thao tác nhạy cảm (đổi email/mật khẩu, đổi cấu hình 2FA, thêm xóa maintainer) **bắt buộc phải qua interactive 2FA**, token không thể can thiệp.

---

## 🛠️ Hướng Dẫn Cấu Hình Môi Trường (Setup ENV)

### 1. Trong file `.env` hoặc Secret CI/CD:
```bash
NPM_TOKEN=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
```

### 2. Sử dụng trong `.npmrc` (để tự động xác thực không cần gõ mật khẩu):
```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

---

## 📖 Toàn Văn Tài Liệu Gốc (Full Official Documentation)

### About Access Tokens
*Note: You must be using npm version 5.5.1 or greater to use access tokens.*

An access token is an alternative to using your username and password for authenticating to npm when using the API or the npm command-line interface (CLI). An access token is a hexadecimal string that you can use to authenticate, and which gives you the right to install and/or publish your modules.

As of November 2025, only **Granular access tokens** are supported. Legacy access tokens have been removed.

You can create access tokens to give other tools (such as continuous integration testing environments) access to your npm packages. For example, GitHub Actions provides the ability to store secrets, such as access tokens, that you can then use to authenticate. When your workflow runs, it will be able to complete npm tasks as you, including installing private packages you can access.

You can work with tokens from the web or the CLI, whichever is easiest. What you do in each environment will be reflected in the other environment.

npm token commands let you:
- View tokens for easier tracking and management
- Limit access according to IP address ranges (CIDR)
- Delete/revoke tokens

---

### About Granular Access Tokens
Granular access tokens allow you to restrict access provided to the token based on what you want to use the token for. With granular access tokens, you can:
- Restrict which packages and scopes a token has access to
- Grant tokens access to specific organizations
- Set a token expiration date
- Limit token access based on IP address ranges
- Select between Read-only or Read and write access. For packages and scopes, Read and write access can either publish and stage new versions or be stage only.
- Configure a token to Bypass 2FA requirements

You can create up to 1000 granular access tokens on your npm account. You can set how long your token is valid for, at least one day in the future. Each token can access up to 50 organizations, and up to either 50 packages, 50 scopes, or a combination of 50 packages and scopes. Access tokens are tied to users’ permission; hence it cannot have more permission than the user at any point in time. If a user has their access revoked from a package or an org., their granular access token will also have its access revoked from those packages or org.

When you give a token access to an organization, the token can only be used for managing organization settings and teams or users associated with the organization. It does not give the token the right to publish packages managed by the organization.

The Bypass 2FA capability applies to tokens with write access and is set to false by default at token creation. When the Bypass 2FA option is set to true, this setting takes precedence over account-level and package-level 2FA settings for package and automation actions such as publishing. This means that even if account-level 2FA is enabled and/or package-level 2FA is required, 2FA will still be bypassed when using the token to publish. Do not set Bypass 2FA to true if a package or organization requires fully enforced 2FA.

---

### About Stage-Only Tokens
When a granular access token has Read and write access to packages and scopes, you can choose how it is allowed to publish:
- **Read and write (publish and stage)**: the token can publish new package versions directly to the registry.
- **Read and write (stage only)**: the token cannot publish new package versions directly. Instead, it stages a version for a package maintainer to review and promote.

Stage-only tokens are a safer on-ramp for automation such as continuous integration and deployment (CI/CD). Because a stage-only token can't publish a new version directly — each staged version must be reviewed and promoted by a maintainer with two-factor authentication (2FA) — a leaked or misused token can't get a new version onto the registry without that maintainer approval. This narrows the risk of direct publishing; it does not otherwise restrict the token's write capabilities.

A stage-only token can:
- Stage a new package version for review, using `npm stage publish`
- Deprecate package versions
- Move dist-tags

A stage-only token cannot:
- Publish a new package version directly. Attempting to publish a new version fails with the error `E_STAGE_REQUIRED`.

#### Publishing with a stage-only token:
1. **Stage the version**: In your automation or CLI, run `npm stage publish` instead of `npm publish`. This uploads the version and creates a stage that is not yet live.
2. **Review the stage**: A maintainer can list pending stages with `npm stage list` and inspect one with `npm stage view <stage-id>` or `npm stage download <stage-id>`.
3. **Promote the version**: A maintainer with 2FA enabled promotes the staged version to the registry with `npm stage approve <stage-id> --otp <code>`, or discards it with `npm stage reject <stage-id>`.

---

### Deprecation Notices & Timeline
- **Direct publishing is being deprecated**: Bypass-2FA tokens with direct-publish access are being deprecated. The ability to publish new package versions directly with a granular access token will be removed in **January 2027**. Switch automation that publishes new versions to Read and write (stage only).
- **Account-identity actions require an interactive 2FA challenge**: Starting **August 2026**, tokens with Bypass 2FA enabled can no longer be used to perform account-identity or account-governance actions (change email/password, modify 2FA, create/manage tokens, add/remove maintainers, org governance).
