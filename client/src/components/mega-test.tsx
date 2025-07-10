export function MegaTest() {
  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'red',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'yellow',
        color: 'black',
        padding: '50px',
        fontSize: '30px',
        fontWeight: 'bold',
        border: '10px solid blue',
        textAlign: 'center'
      }}>
        MEGA TEST - CAN YOU SEE THIS???
        <br />
        BLACK TEXT ON YELLOW BACKGROUND
        <br />
        WITH BLUE BORDER
      </div>
    </div>
  );
}