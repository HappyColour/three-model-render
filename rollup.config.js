import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import dts from 'rollup-plugin-dts'

const external = [/^three/, /^three\//]  // 匹配所有 three.js 相关导入

// 主模块配置
const modules = [
    'core',
    'interaction',
    'camera',
    'loader',
    'ui',
    'effect',
    'setup'
]

// 生成每个模块的配置
const moduleConfigs = modules.flatMap(module => [
    // ESM + CJS
    {
        input: `src/${module}/index.ts`,
        external,
        output: [
            {
                file: `dist/${module}/index.mjs`,
                format: 'es',
                sourcemap: true
            },
            {
                file: `dist/${module}/index.js`,
                format: 'cjs',
                sourcemap: true
            }
        ],
        plugins: [
            resolve({
                extensions: ['.ts', '.js']
            }),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
                sourceMap: true
            })
        ]
    },
    // 类型定义
    {
        input: `src/${module}/index.ts`,
        external,
        output: {
            file: `dist/${module}/index.d.ts`,
            format: 'es'
        },
        plugins: [dts({
            respectExternal: true
        })]
    }
])

export default [
    // 主入口 ESM + CJS
    {
        input: 'src/index.ts',
        external,
        output: [
            {
                file: 'dist/index.mjs',
                format: 'es',
                sourcemap: true
            },
            {
                file: 'dist/index.js',
                format: 'cjs',
                sourcemap: true,
                exports: 'named'
            }
        ],
        plugins: [
            resolve({
                extensions: ['.ts', '.js']
            }),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
                sourceMap: true
            })
        ]
    },
    // 主入口类型定义
    {
        input: 'src/index.ts',
        external,
        output: {
            file: 'dist/index.d.ts',
            format: 'es'
        },
        plugins: [dts({
            respectExternal: true
        })]
    },
    // 各子模块配置
    ...moduleConfigs
]
