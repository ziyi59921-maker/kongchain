# 控链文档索引

| 文档 | 内容 |
|---|---|
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | 产品定义、开放任务原则、专业能力边界、开发者模式、非目标 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 基于 DSH 0.2.2-alpha.2 实检的 Profile/Bundle/Plugin/Tool/Skill/Plugin Manager/开发模式 |
| [EXTENSION_GUIDE.md](EXTENSION_GUIDE.md) | 创建 profile、安装 bundle、启动、验证、新增工具/技能、故障排查 |
| [BATCH_1_VERIFICATION.md](BATCH_1_VERIFICATION.md) | 第 1 批实际启动与验证记录（扩展基础、工具、技能 provider） |
| [BATCH_2_VERIFICATION.md](BATCH_2_VERIFICATION.md) | 第 2 批验证记录（内控专业指令、8 个技能、品牌、四个开放任务实测） |
| [BATCH_3_VERIFICATION.md](BATCH_3_VERIFICATION.md) | 第 3 批验证记录（插件工坊、对话创建/修改插件、19 项测试、真实调用、安装失败回退） |

| [BATCH_4_VERIFICATION.md](BATCH_4_VERIFICATION.md) | 第 4 批验证记录（开发者模式 guard、/developer 入口、插件 0.1.2、回滚/恢复、自有源码测试） |

| [BATCH_5_VERIFICATION.md](BATCH_5_VERIFICATION.md) | 第 5 批验证记录（文档/财务/规则/证据/报告工具、四任务实测、依赖许可证） |

| [BATCH_6_VERIFICATION.md](BATCH_6_VERIFICATION.md) | 第 6 批验证记录（能力发现/CSV 工具创建/安装注册/实际调用/更新失败/dev-mode 回滚） |

| [BATCH_7_VERIFICATION.md](BATCH_7_VERIFICATION.md) | 第 7 批验证记录（插件生命周期：创建/版本/升级/激活/失败保留/清单/启停/卸载/重装） |

| [BATCH_8_VERIFICATION.md](BATCH_8_VERIFICATION.md) | 第 8 批验证记录（合同条款标记插件 contract-term-tags：创建/24 项测试/安装/组合树证据/限制） |

| [../kongchain-release-readiness.md](../kongchain-release-readiness.md) | 最终产品交付：场景 A–F、安全验证、启动/恢复、清单与优先级 |

| [BATCH_9_VERIFICATION.md](BATCH_9_VERIFICATION.md) | 第 7 批验证记录（用户工作台 UI、真实状态、上传、刷新、响应式） |

| [BATCH_10_VERIFICATION.md](BATCH_10_VERIFICATION.md) | 第 8 批验证记录（五类财务工具、合成数据、单元/端到端测试、主 Agent 实测） |

| [BATCH_11_VERIFICATION.md](BATCH_11_VERIFICATION.md) | 第 9 批验证记录（六专家配置、Agent Preset 调度、结构化交接、UI 专家中心、失败/分歧） |

| [BATCH_12_VERIFICATION.md](BATCH_12_VERIFICATION.md) | 第 10 批验证记录（任务记录、证据追溯、状态机、失败降级） |

| [BATCH_13_VERIFICATION.md](BATCH_13_VERIFICATION.md) | 第 11 批验证记录（能力发现/创建/安装/调用/更新失败/dev 恢复） |

控链自有代码位于仓库根目录 `extensions/`，与上游 `packages/`、`apps/`、`vendor/` 等目录分离。
