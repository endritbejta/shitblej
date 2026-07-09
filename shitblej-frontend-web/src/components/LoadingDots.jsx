export default function LoadingDots({ size = "md", color = "green" }) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const colorClasses = {
    green: "bg-green-500",
    white: "bg-white",
    gray: "bg-gray-500",
    black: "bg-black",
  };

  const dotSize = sizeClasses[size] || sizeClasses.md;
  const dotColor = colorClasses[color] || colorClasses.green;

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${dotSize} ${dotColor} rounded-full animate-bounce delay-[0ms]`}></div>
      <div className={`${dotSize} ${dotColor} rounded-full animate-bounce delay-[150ms]`}></div>
      <div className={`${dotSize} ${dotColor} rounded-full animate-bounce delay-[300ms]`}></div>
    </div>
  );
}
