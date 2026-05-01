import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export function NotFound404Page() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="La página que buscas no existe."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Ir al inicio
        </Button>
      }
    />
  );
}
