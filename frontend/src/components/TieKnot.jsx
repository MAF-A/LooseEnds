export default function TieKnot() {
  return (
    <svg 
      className="knot-svg" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        We use a single path to draw a figure-8 knot. 
        The CSS animation will "draw" this line from start to finish.
      */}
      <path
        className="knot-path"
        d="M 50,50 C 80,20 90,80 50,50 C 10,20 20,80 50,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}