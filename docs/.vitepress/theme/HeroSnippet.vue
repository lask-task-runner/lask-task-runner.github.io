<template>
  <div class="hero-card" aria-hidden="true">
    <div class="hero-card-bar"><i /><i /><i /></div>
    <pre><code><span class="c">// main.lask</span>
alpine = <span class="s">#alpine:3.22.2</span>

<span class="c">// Say hello from a container.</span>
<span class="f">greet</span>(--name = <span class="s">"World"</span>) =
  <span class="s">$[alpine]</span> echo <span class="s">"Hello, #{name}!"</span>

<span class="p">$</span> lask check
<span class="p">$</span> lask sync
<span class="p">$</span> lask run greet --name Lask</code></pre>
  </div>
</template>
