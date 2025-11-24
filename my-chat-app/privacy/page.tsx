import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft size={16} /> トップへ戻る
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
          AI Chat Tracker プライバシーポリシー
        </h1>

        <div className="space-y-8 leading-relaxed text-sm md:text-base">
          <p>
            提供者は、Chrome拡張機能およびWebアプリケーション「AI Chat Tracker」（以下、「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. 取得する情報と利用目的</h2>
            <p className="mb-4">
              本サービスは、ユーザーが対象となるAIチャットサービス（ChatGPT、Google Geminiなど）を利用した際の学習記録を可視化することを目的としています。そのために必要な、以下の最小限の情報のみを取得・利用します。
            </p>

            <h3 className="text-lg font-bold text-gray-800 mt-4 mb-2">1.1. 取得する情報</h3>
            <div className="pl-4 mb-4">
              <p className="font-bold mb-1">認証情報:</p>
              <ul className="list-disc pl-5 mb-3 text-gray-600">
                <li>ユーザーID（Googleアカウント認証により発行される一意の識別子）</li>
                <li>メールアドレス（アカウントの識別と管理のために使用します）</li>
              </ul>

              <p className="font-bold mb-1">利用統計データ:</p>
              <ul className="list-disc pl-5 text-gray-600">
                <li>利用した対象サービス名（例: &quot;ChatGPT&quot;, &quot;Gemini&quot;）</li>
                <li>メッセージ送信アクションの種別（例: &quot;click&quot;, &quot;enter-key&quot;）</li>
                <li>アクション発生日時（タイムスタンプ）</li>
              </ul>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2">1.2. 重要な例外（取得しない情報）</h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-700">
              <p className="font-bold mb-1">⚠️ プライバシーの尊重</p>
              <p>
                本サービスは、ユーザーのプライバシーを最大限に尊重します。
                <strong>ユーザーがAIチャットサービスに対して送信したテキスト本文（具体的な会話内容、プロンプト、質問等）は、一切取得・保存いたしません。</strong>
              </p>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2">1.3. 利用目的</h3>
            <p className="mb-2">取得した情報は、以下の目的のためにのみ利用します。</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>本サービスの主要機能である「チャット利用回数の記録とグラフ表示」を提供するため。</li>
              <li>ユーザーごとの利用データを区別し、適切に管理するため。</li>
              <li>本サービスの利用状況を分析し、機能改善や品質向上の参考にするため。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. 第三者への提供</h2>
            <p className="mb-4">
              提供者は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、取得した個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-600">
              <li>法令に基づく場合。</li>
              <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき。</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき。</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. 情報の管理</h2>
            <p>
              提供者は、取得したユーザー情報を正確かつ最新の状態に保ち、不正アクセス、紛失、破損、改ざん、漏洩などを防止するため、セキュリティシステムの維持、管理体制の整備等の必要な措置を講じ、安全対策を実施します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. プライバシーポリシーの変更</h2>
            <p>
              本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく変更することができるものとします。提供者が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. お問い合わせ窓口</h2>
            <p className="mb-3">本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <dl className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-bold min-w-[100px]">提供者名:</dt>
                  <dd>biwako</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-bold min-w-[100px]">メールアドレス:</dt>
                  <dd>
                    <a href="mailto:biwako0206@gmail.com" className="text-blue-600 hover:underline break-all">
                      biwako0206@gmail.com
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <div className="pt-8 mt-12 border-t text-right text-sm text-gray-500">
            <p>制定日：2025年11月24日</p>
          </div>
        </div>
      </div>
    </div>
  );
}