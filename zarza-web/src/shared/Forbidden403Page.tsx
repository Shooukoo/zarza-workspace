import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export function Forbidden403Page() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="No tienes permiso para ver esta página."
      extra={
        <Button type="primary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      }
    />
  );
}
