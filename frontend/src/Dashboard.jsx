function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
}

export default Dashboard;
