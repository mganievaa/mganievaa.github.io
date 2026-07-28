# Madina Ganieva — portfolio

Обновлённая версия портфолио с сохранением исходной бордово-молочной палитры.

## Что улучшено

- единая адаптивная типографика и система отступов;
- композиция главной, страницы проектов и About;
- анимации появления, hover-эффекты и лёгкий параллакс коллажа;
- пиксельный курсор-сердце для мыши/трекпада;
- полностью переработанное мобильное меню;
- состояния фокуса, `prefers-reduced-motion`, активные пункты навигации;
- более выразительные карточки проектов;
- индикатор прокрутки на длинных страницах;
- graceful fallback при отсутствии изображений галереи.

## Важно

В исходном ZIP отсутствовали папки `src/bahore`, `src/dark`, `src/kazimir` и `src/lionel`. HTML-ссылки на них сохранены. После добавления исходных изображений по прежним путям галереи заработают автоматически; до этого отображается аккуратная заглушка.

## Запуск

Откройте `index.html` или запустите локальный сервер из корня проекта:

```bash
python3 -m http.server 8000
```

## Art direction update

- Project galleries now use a responsive editorial rhythm. Images retain their original aspect ratio; no crop is applied.
- The first project frame is loaded eagerly; following 6K images remain lazy-loaded to reduce initial rendering cost.
- Clipped photo compositions on Home and About include an interactive film-burn consequence cue.
- The mobile burger remains fixed above the menu layer and transforms into a centred close icon.

## Current interaction update

- The click-to-develop photo effect and its sound were removed.
- Home uses a lightweight animated editorial label and a modern circular cursor.
- Work-card categories are real editable HTML elements (`.work-category`) rather than generated pseudo-content.
- Project intros use a floating action block; the description wraps beside it and continues underneath.
