export default function UnauthorizedPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-gray-600">You do not have permission to view this page.</p>
    </div>
  );
}
