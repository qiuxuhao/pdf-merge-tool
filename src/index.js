import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';

/**
 * React应用入口文件
 * 作者: qxh
 * 功能: 配置国际化并启动应用
 */

// 创建根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用，配置中文语言包
root.render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
); 