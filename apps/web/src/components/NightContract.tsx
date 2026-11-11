interface NightContractProps { onLoadout: () => void }

export function NightContract({ onLoadout }: NightContractProps) {
  return <aside className="night-contract" aria-labelledby="night-contract-heading" data-testid="night-contract">
    <p className="night-contract-status"><span aria-hidden="true" />НОЧНОЙ КОНТРАКТ ОТКРЫТ</p>
    <h2 id="night-contract-heading">Пора на ночную смену.</h2>
    <p className="night-contract-description">За дверью — первое боевое задание. Выйди из квартиры и зачисти здание: внутри 6 противников.</p>
    <button data-testid="mission-dispatch" onClick={onLoadout}>ВЫБРАТЬ СНАРЯЖЕНИЕ <span aria-hidden="true">↗</span></button>
    <p className="night-contract-tip">Выход подсвечен. Нет патронов? Ближний бой доступен всегда.</p>
  </aside>;
}
