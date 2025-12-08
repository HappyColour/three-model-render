# 📦 three-model-render 发布指南

## 发布到个人 npm 私有仓库

### 方案一：使用 npm 官方私有包（推荐）

如果您有 npm 付费账户，可以发布 scoped 私有包。

#### 1. 修改 package.json

将包名改为 scoped 格式：

```json
{
  "name": "@your-username/three-model-render",
  "version": "1.0.0",
  "private": false,
  "publishConfig": {
    "access": "restricted"  // 私有包
  }
}
```

#### 2. 登录 npm

```bash
npm login
# 输入用户名、密码、邮箱
```

#### 3. 构建和发布

```bash
# 1. 安装依赖
cd three-model-render
pnpm install

# 2. 构建包
pnpm run build

# 3. 发布
npm publish
```

---

### 方案二：使用 Verdaccio 私有仓库

如果您有自己的私有 npm 仓库（如 Verdaccio），按以下步骤操作。

#### 1. 修改 package.json

```json
{
  "name": "@your-scope/three-model-render",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "http://your-registry.com:4873/"
  }
}
```

#### 2. 配置 npm registry

**方法1：仅为此包设置（推荐）**
```bash
npm config set @your-scope:registry http://your-registry.com:4873/
```

**方法2：全局设置（谨慎使用）**
```bash
npm config set registry http://your-registry.com:4873/
```

#### 3. 登录私有仓库

```bash
npm login --registry=http://your-registry.com:4873/
```

#### 4. 构建和发布

```bash
cd three-model-render
pnpm install
pnpm run build
npm publish
```

---

### 方案三：使用 GitHub Packages

如果您使用 GitHub，可以发布到 GitHub Packages。

#### 1. 创建 .npmrc 文件

在项目根目录创建 `.npmrc`：

```
@your-github-username:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

#### 2. 修改 package.json

```json
{
  "name": "@your-github-username/three-model-render",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/three-model-render.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### 3. 发布

```bash
cd three-model-render
pnpm install
pnpm run build
npm publish
```

---

## 🔧 发布前检查清单

### 1. 更新 package.json

```bash
cd c:\Users\HP\zhangxin\epc\bei-san-xian\three-model-render
code package.json
```

需要修改的字段：
- ✅ `name`: 改为 `@your-username/three-model-render`
- ✅ `author`: 填写您的名字
- ✅ `repository`: 填写仓库地址（如果有）
- ✅ `publishConfig`: 配置发布目标

### 2. 清理和准备

```bash
# 清理旧的构建
rm -rf dist

# 确保 node_modules 更新
pnpm install
```

### 3. 本地测试

```bash
# 构建
pnpm run build

# 检查构建产物
ls dist/

# 打包测试（不发布）
npm pack

# 会生成 your-username-three-model-render-1.0.0.tgz
```

### 4. 测试安装

在另一个项目中测试安装：

```bash
cd ../test-project
pnpm install ../three-model-render/your-username-three-model-render-1.0.0.tgz

# 测试导入
node -e "console.log(require('@your-username/three-model-render'))"
```

---

## 📝 完整发布流程

### 步骤1：准备包

```bash
cd c:\Users\HP\zhangxin\epc\bei-san-xian\three-model-render

# 安装依赖
pnpm install

# 类型检查
pnpm run type-check

# 构建
pnpm run build
```

### 步骤2：版本管理

```bash
# 查看当前版本
npm version

# 更新版本（选择一个）
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

### 步骤3：登录和发布

```bash
# 登录（如果还未登录）
npm login

# 发布
npm publish

# 如果是 scoped 私有包
npm publish --access restricted

# 如果是 scoped 公开包
npm publish --access public
```

### 步骤4：验证发布

```bash
# 查看包信息
npm view @your-username/three-model-render

# 在新项目中安装测试
mkdir test-install
cd test-install
pnpm init
pnpm add @your-username/three-model-render
```

---

## 🔐 认证配置

### 配置 .npmrc（可选）

在用户目录或项目目录创建 `.npmrc`：

**用户级别**（`~/.npmrc`）：
```
//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN
@your-scope:registry=https://your-private-registry.com
```

**项目级别**（项目根目录）：
```
registry=https://your-private-registry.com
//your-private-registry.com/:_authToken=YOUR_TOKEN
```

### 生成 npm token

```bash
npm login
npm token create --read-only  # 只读 token
npm token create              # 完整权限 token
```

---

## 🚀 快速发布命令

创建一个发布脚本 `publish.sh`：

```bash
#!/bin/bash

echo "🔍 检查当前分支..."
if [ "$(git branch --show-current)" != "main" ]; then
  echo "❌ 请在 main 分支发布"
  exit 1
fi

echo "📦 安装依赖..."
pnpm install

echo "🔨 构建包..."
pnpm run build

echo "✅ 运行类型检查..."
pnpm run type-check

echo "📋 打包测试..."
npm pack

echo "🚀 准备发布..."
read -p "确认发布? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm publish
  echo "✅ 发布成功！"
else
  echo "❌ 取消发布"
fi
```

使用：
```bash
chmod +x publish.sh
./publish.sh
```

---

## 📊 常见问题

### Q: 如何撤销已发布的版本？

```bash
# 撤销指定版本（24小时内）
npm unpublish @your-username/three-model-render@1.0.0

# 撤销整个包（谨慎使用）
npm unpublish @your-username/three-model-render --force
```

### Q: 如何发布 beta 版本？

```bash
# 版本号使用 beta 标签
npm version 1.1.0-beta.0

# 发布到 beta tag
npm publish --tag beta

# 安装 beta 版本
pnpm add @your-username/three-model-render@beta
```

### Q: 如何更新已发布的包？

```bash
# 1. 修改代码
# 2. 更新版本号
npm version patch

# 3. 重新构建
pnpm run build

# 4. 发布
npm publish
```

### Q: 构建失败怎么办？

检查：
1. `node_modules` 是否完整？运行 `pnpm install`
2. TypeScript 错误？运行 `pnpm run type-check`
3. 依赖版本冲突？检查 `pnpm-lock.yaml`

---

## 🎯 推荐配置

### 推荐方案：npm 官方 + scoped package

**优点：**
- ✅ 官方支持，稳定可靠
- ✅ 免费的 scoped 公开包
- ✅ 付费可使用私有包
- ✅ 完善的权限管理

**步骤：**

1. **修改 package.json：**
```json
{
  "name": "@your-npm-username/three-model-render",
  "publishConfig": {
    "access": "restricted"  // 私有
    // 或
    "access": "public"      // 公开
  }
}
```

2. **发布：**
```bash
cd three-model-render
pnpm install
pnpm run build
npm login
npm publish
```

3. **使用：**
```bash
pnpm add @your-npm-username/three-model-render
```

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. 使用哪种私有仓库方案？
2. 您的 npm 用户名是什么？
3. 遇到了什么错误？

我会帮您解决！
