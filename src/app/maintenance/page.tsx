async function fetchAiSuggestion(task: string) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task }),
  });

  const data = await res.json();
  return data.answer;
}

export default function Component() {
  async function handleClick() {
    const ans = await fetchAiSuggestion("Яке ТО треба зробити кондиціонеру HPS?");
    console.log(ans);
  }

  return (
    <button onClick={handleClick}>
      Запитати ШІ
    </button>
  );
}
