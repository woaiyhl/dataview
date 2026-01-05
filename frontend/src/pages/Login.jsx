import React, { useState } from 'react';
import { Form, Input, Button, message, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { themeConfig } from '../theme';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isLogin) {
        await login(values.username, values.password);
        message.success('登录成功');
      } else {
        await register(values.username, values.password);
        message.success('注册成功');
      }
      navigate('/');
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    form.resetFields();
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-teal-50 relative overflow-hidden">
        {/* 背景装饰圆圈 */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[100px]" />

        <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 relative z-10 transition-all duration-300 hover:shadow-3xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-gray-500">
              {isLogin ? '登录以管理您的数据视图' : '开始您的数据可视化之旅'}
            </p>
          </div>

          <Form
            form={form}
            name="auth_form"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            className="space-y-4"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="用户名"
                className="rounded-lg py-3"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="密码"
                className="rounded-lg py-3"
              />
            </Form.Item>

            {!isLogin && (
              <Form.Item
                name="confirm"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="确认密码"
                  className="rounded-lg py-3"
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full rounded-lg h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none shadow-lg shadow-blue-500/30"
              >
                {isLogin ? '登 录' : '注 册'}
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-6">
            <span className="text-gray-500 text-sm">
              {isLogin ? '还没有账户？' : '已有账户？'}
            </span>
            <button
              onClick={toggleMode}
              className="ml-2 text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none transition-colors"
            >
              {isLogin ? '立即注册' : '直接登录'}
            </button>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Login;
