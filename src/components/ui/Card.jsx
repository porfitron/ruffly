export default function Card({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`rounded-3xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
